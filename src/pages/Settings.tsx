import { useState, useEffect, useRef } from 'react';
import { Save, Key, FileText, CheckCircle2, Upload, File, X } from 'lucide-react';
import { repository } from '../services/db';
import { AppSettings } from '../types';

export default function Settings() {
  const [settings, setSettings] = useState<Partial<AppSettings>>({
    resumeText: '',
    resumeFile: null,
    resumeFileName: null,
    asrApiKey: '',
    llmApiKey: ''
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTestApi = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Test ASR
      const sampleRate = 8000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
      const blockAlign = numChannels * (bitsPerSample / 8);
      const dataSize = sampleRate * blockAlign; // 1 second of silence
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);
      
      // Write WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
      };
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(36, 'data');
      view.setUint32(40, dataSize, true);
      // Data is already 0 (silence)
      
      const audioBlob = new Blob([buffer], { type: 'audio/wav' });
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'test.wav');
      formData.append('model', 'FunAudioLLM/SenseVoiceSmall');

      const asrRes = await fetch('/api/asr', {
        method: 'POST',
        headers: {
          'Authorization': settings.asrApiKey ? `Bearer ${settings.asrApiKey}` : ''
        },
        body: formData
      });

      if (!asrRes.ok) {
        const err = await asrRes.text();
        throw new Error(`语音转录(ASR)测试失败: ${err}`);
      }

      // Test LLM
      const llmProvider = settings.llmProvider || 'kimi';
      const modelName = settings.llmModel || (llmProvider === 'kimi' ? 'moonshot-v1-8k' : 
                        llmProvider === 'deepseek' ? 'deepseek-chat' : 
                        llmProvider === 'gemini' ? 'gemini-2.5-flash' :
                        llmProvider === 'claude' ? 'claude-3-5-sonnet-20241022' :
                        llmProvider === 'qwen' ? 'qwen-plus' : 'ep-xxxxxxxx-xxxx');

      const llmRes = await fetch('/api/llm', {
        method: 'POST',
        headers: {
          'Authorization': settings.llmApiKey ? `Bearer ${settings.llmApiKey}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: llmProvider,
          model: modelName,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        })
      });

      if (!llmRes.ok) {
        const err = await llmRes.text();
        throw new Error(`AI 复盘(${llmProvider})测试失败: ${err}`);
      }

      setTestResult({ success: true, message: "🎉 测试成功！两个 API 均可正常连通。" });
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsTesting(false);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await repository.getSettings();
    if (data) {
      setSettings(data);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await repository.saveSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('请上传 PDF 格式的简历文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过 10MB');
        return;
      }
      setSettings({ ...settings, resumeFile: file, resumeFileName: file.name });
    }
  };

  const removeFile = () => {
    setSettings({ ...settings, resumeFile: null, resumeFileName: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto pb-8">
      <header className="mb-6 pt-4">
        <h1 className="text-2xl font-bold text-gray-900">设置</h1>
        <p className="text-sm text-gray-500 mt-1">配置你的个人简历与 API Key</p>
      </header>

      <div className="space-y-6">
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">我的简历</h2>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              上传 PDF
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="application/pdf" 
              className="hidden" 
            />
          </div>
          <p className="text-xs text-gray-500 mb-4">上传 PDF 简历或粘贴文本，AI 将基于此为你提供更精准的面试复盘与建议。</p>
          
          {settings.resumeFileName && (
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4">
              <div className="flex items-center">
                <File className="w-5 h-5 text-indigo-500 mr-2" />
                <span className="text-sm font-medium text-gray-700">{settings.resumeFileName}</span>
              </div>
              <button 
                onClick={removeFile}
                className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <textarea
            className="w-full h-48 p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            placeholder="在此粘贴你的简历正文内容（如果已上传 PDF，此项为可选补充）..."
            value={settings.resumeText || ''}
            onChange={(e) => setSettings({ ...settings, resumeText: e.target.value })}
          />
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mr-3">
              <Key className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">API Key 配置</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            如果不填写，将默认使用系统提供的免费额度。如果你有自己的 Key，可以在下方填入。
          </p>
          
          <div className="space-y-5">
            {/* ASR Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                1. 语音转录 (ASR) API Key
              </label>
              <p className="text-xs text-gray-500 mb-2">
                用于将面试录音转为文字。请前往 <a href="https://cloud.siliconflow.cn/account/ak" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">硅基流动</a> 获取免费 Key。
              </p>
              <input
                type="password"
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="输入硅基流动的 sk-... 密钥"
                value={settings.asrApiKey || ''}
                onChange={(e) => setSettings({ ...settings, asrApiKey: e.target.value })}
              />
            </div>

            {/* LLM Key */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  2. AI 复盘模型 API Key
                </label>
                <select
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  value={settings.llmProvider || 'kimi'}
                  onChange={(e) => {
                    const provider = e.target.value as any;
                    const defaultModels: Record<string, string> = {
                      kimi: 'moonshot-v1-8k',
                      deepseek: 'deepseek-chat',
                      gemini: 'gemini-2.5-flash',
                      claude: 'claude-3-5-sonnet-20241022',
                      qwen: 'qwen-plus',
                      doubao: 'ep-xxxxxxxx-xxxx'
                    };
                    setSettings({ ...settings, llmProvider: provider, llmModel: defaultModels[provider] });
                  }}
                >
                  <option value="kimi">Kimi (月之暗面)</option>
                  <option value="deepseek">DeepSeek (深度求索)</option>
                  <option value="gemini">Gemini (Google)</option>
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="qwen">千问 (阿里)</option>
                  <option value="doubao">豆包 (火山引擎)</option>
                </select>
              </div>
              
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <input
                    type="password"
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="输入 API Key (sk-...)"
                    value={settings.llmApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, llmApiKey: e.target.value })}
                  />
                </div>
                <div className="w-1/3">
                  <input
                    type="text"
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="模型名称"
                    value={settings.llmModel || (
                      settings.llmProvider === 'deepseek' ? 'deepseek-chat' : 
                      settings.llmProvider === 'gemini' ? 'gemini-2.5-flash' :
                      settings.llmProvider === 'claude' ? 'claude-3-5-sonnet-20241022' :
                      settings.llmProvider === 'qwen' ? 'qwen-plus' :
                      settings.llmProvider === 'doubao' ? 'ep-xxxxxxxx-xxxx' :
                      'moonshot-v1-8k'
                    )}
                    onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {(!settings.llmProvider || settings.llmProvider === 'kimi') && 'Kimi 擅长超长文本处理，非常适合长篇面试复盘。'}
                {settings.llmProvider === 'deepseek' && 'DeepSeek 逻辑推理能力极强，性价比高。'}
                {settings.llmProvider === 'gemini' && 'Gemini 速度极快，免费额度充足。'}
                {settings.llmProvider === 'claude' && 'Claude 3.5 Sonnet 逻辑与代码能力顶尖。'}
                {settings.llmProvider === 'qwen' && '通义千问中文能力优秀。'}
                {settings.llmProvider === 'doubao' && '豆包模型请在右侧输入框填入你的 Endpoint ID (ep-...)。'}
              </p>
            </div>

            {/* Test Button */}
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleTestApi}
                disabled={isTesting}
                className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-70"
              >
                {isTesting ? '正在测试连接...' : '测试 API 连通性'}
              </button>
              
              {testResult && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {testResult.message}
                </div>
              )}
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center"
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              已保存
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? '保存中...' : '保存设置'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
