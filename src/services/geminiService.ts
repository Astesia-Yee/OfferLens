import { repository } from './db';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { chunkAudio } from '../utils/audioUtils';

// Set worker URL to local bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function generateTranscriptAndReview(
  audioBlob: Blob,
  resumeText: string,
  resumeFile: Blob | null | undefined,
  company: string,
  position: string,
  onProgress?: (status: string) => void
): Promise<{ transcript: string; report: string }> {
  const settings = await repository.getSettings();
  const asrApiKey = settings?.asrApiKey || '';
  const llmApiKey = settings?.llmApiKey || '';

  // 1. Parse PDF if exists
  onProgress?.("正在解析简历...");
  let extractedPdfText = "";
  if (resumeFile) {
    try {
      const arrayBuffer = await resumeFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        extractedPdfText += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
    } catch (e) {
      console.error("PDF parsing failed", e);
      extractedPdfText = "[PDF 解析失败，请参考文本简历]";
    }
  }

  // 2. ASR (Audio to Text) using SenseVoiceSmall via SiliconFlow
  onProgress?.("正在处理音频...");
  
  // If audio is larger than 4MB, we chunk it to avoid Vercel Serverless limits (4.5MB)
  // We use 120 seconds (2 minutes) per chunk which is ~3.8MB in 16kHz mono WAV
  const MAX_FILE_SIZE = 4 * 1024 * 1024;
  let audioChunks: Blob[] = [audioBlob];
  
  if (audioBlob.size > MAX_FILE_SIZE) {
    onProgress?.("音频文件较大，正在进行智能切片压缩...");
    try {
      audioChunks = await chunkAudio(audioBlob, 120); // 2 mins chunks
    } catch (e) {
      console.error("Audio chunking failed", e);
      // Fallback to original blob if chunking fails
      audioChunks = [audioBlob];
    }
  }

  let fullTranscript = "";
  
  for (let i = 0; i < audioChunks.length; i++) {
    const chunk = audioChunks[i];
    if (audioChunks.length > 1) {
      onProgress?.(`正在转录音频片段 ${i + 1}/${audioChunks.length}...`);
    } else {
      onProgress?.("正在进行语音转文字...");
    }

    const formData = new FormData();
    // Use .wav extension if we chunked it, otherwise keep original
    const ext = audioChunks.length > 1 ? 'wav' : 'webm';
    formData.append('file', chunk, `audio.${ext}`);
    formData.append('model', 'FunAudioLLM/SenseVoiceSmall');

    const asrRes = await fetch('/api/asr', {
      method: 'POST',
      headers: {
        'Authorization': asrApiKey ? `Bearer ${asrApiKey}` : ''
      },
      body: formData
    });

    if (!asrRes.ok) {
      const err = await asrRes.text();
      throw new Error(`语音识别失败 (片段 ${i + 1}): ${err}`);
    }

    const asrData = await asrRes.json();
    const text = asrData.text || asrData.text_cn || "";
    fullTranscript += text + " ";
  }

  const transcript = fullTranscript.trim() || "未能识别到语音内容";

  // 3. LLM (Review) using DeepSeek Official API
  onProgress?.("正在生成 AI 复盘报告...");
  const combinedResume = `
用户填写的简历文本:
${resumeText || "无"}

PDF简历解析内容:
${extractedPdfText || "无"}
  `;

  const prompt = `
你是一个资深的产品经理面试官和职业规划师。
我将提供一段我面试 ${company} 的 ${position} 岗位的面试录音转录文本。

这是我的简历信息：
${combinedResume}

这是面试的原始录音转录文本：
${transcript}

请执行以下两项任务：
任务一：梳理面试对话
根据原始转录文本，区分出“面试官 (Interviewer)”和“候选人 (Candidate)”的对话，整理成结构化的对话记录。

任务二：进行深度的面试复盘
对我的面试表现进行全面的复盘和分析，必须全部使用中文输出。

请严格以 JSON 格式输出。
【重要格式要求 - 必读】：
1. 必须是完全合法的 JSON 对象。
2. 绝对不要在字符串内部使用未转义的英文双引号（"）。如果需要引用内容，必须使用中文双引号（“”）或单引号（''）。（例如：错误写法："他说："你好""，正确写法："他说：‘你好’"）。
3. 字符串内部绝对不能包含真实的换行符，如果需要换行请使用转义字符 \\n。
4. 绝对不要包含任何 markdown 代码块标记（如 \`\`\`json），不要有任何前言或后语。

JSON 的结构必须如下：
{
  "strengths": ["表现亮点1", "表现亮点2"],
  "weaknesses": ["待改进点1", "待改进点2"],
  "suggestions": ["行动建议1", "行动建议2"],
  "qaAnalysis": [
    {
      "question": "面试官问的问题",
      "answer": "我的回答摘要",
      "review": "诊断点评",
      "betterAnswer": "更佳回答示例"
    }
  ],
  "formattedTranscript": [
    {
      "speaker": "Interviewer",
      "text": "说话内容"
    }
  ]
}
  `;

  const llmProvider = settings?.llmProvider || 'kimi';
  
  let modelName = settings?.llmModel || 'moonshot-v1-8k';
  
  // Auto-upgrade Kimi model if it's the default and text is long
  if (llmProvider === 'kimi' && modelName.startsWith('moonshot-v1')) {
    const estimatedTokens = prompt.length * 1.5;
    if (estimatedTokens > 30000) {
      modelName = 'moonshot-v1-128k';
    } else if (estimatedTokens > 6000) {
      modelName = 'moonshot-v1-32k';
    }
  }

  const llmRes = await fetch('/api/llm', {
    method: 'POST',
    headers: {
      'Authorization': llmApiKey ? `Bearer ${llmApiKey}` : '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      provider: llmProvider,
      model: modelName,
      messages: [
        { role: 'system', content: '你是一个专业的面试复盘助手，必须严格输出合法的 JSON 格式。' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 8192
    })
  });

  if (!llmRes.ok) {
    const err = await llmRes.text();
    throw new Error(`AI 复盘生成失败: ${err}`);
  }

  const llmData = await llmRes.json();
  const text = llmData.choices[0].message.content || "";

  let finalTranscript = transcript;
  let report = "";

  let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const startIndex = cleanText.indexOf('{');
  const endIndex = cleanText.lastIndexOf('}');

  if (startIndex !== -1 && endIndex !== -1) {
    cleanText = cleanText.substring(startIndex, endIndex + 1);
    // Fix common JSON errors: trailing commas
    cleanText = cleanText.replace(/,\s*([\]}])/g, '$1');
    
    try {
      const parsed = JSON.parse(cleanText);
      report = JSON.stringify(parsed);
    } catch (e) {
      console.error("First JSON parse attempt failed", e);
      try {
        // Fallback: try to remove literal newlines that might be breaking strings
        const repairedText = cleanText.replace(/\n/g, ' ').replace(/\r/g, '');
        const parsed = JSON.parse(repairedText);
        report = JSON.stringify(parsed);
      } catch (e2) {
        console.error("Second JSON parse attempt failed", e2);
        report = JSON.stringify({
          strengths: ["解析失败，请重试"],
          weaknesses: ["解析失败，请重试"],
          suggestions: ["解析失败，请重试"],
          qaAnalysis: [],
          rawTextFallback: text
        });
      }
    }
  } else {
    report = JSON.stringify({
      strengths: ["解析失败，请重试"],
      weaknesses: ["解析失败，请重试"],
      suggestions: ["解析失败，请重试"],
      qaAnalysis: [],
      rawTextFallback: text
    });
  }

  return { transcript: finalTranscript, report };
}
