export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const userKey = req.headers.authorization?.replace('Bearer ', '');
    const apiKey = userKey || process.env.DEFAULT_LLM_KEY;

    if (!apiKey) {
      return res.status(401).json({ error: "No LLM API Key configured. Please configure it in settings." });
    }

    const { provider, ...llmBody } = req.body;
    
    let apiUrl = 'https://api.moonshot.cn/v1/chat/completions'; // default kimi
    let headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    let body = JSON.stringify(llmBody);

    if (provider === 'deepseek') {
      apiUrl = 'https://api.deepseek.com/chat/completions';
    } else if (provider === 'gemini') {
      apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    } else if (provider === 'qwen') {
      apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    } else if (provider === 'doubao') {
      apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
      delete llmBody.response_format;
      body = JSON.stringify(llmBody);
    } else if (provider === 'claude') {
      apiUrl = 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      };
      
      // Convert OpenAI format to Anthropic format
      const systemMessage = llmBody.messages.find((m: any) => m.role === 'system')?.content || '';
      const anthropicMessages = llmBody.messages
        .filter((m: any) => m.role !== 'system')
        .map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

      body = JSON.stringify({
        model: llmBody.model || 'claude-3-5-sonnet-20241022',
        max_tokens: llmBody.max_tokens || 4096,
        system: systemMessage,
        messages: anthropicMessages,
        temperature: llmBody.temperature
      });
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).send(err);
    }

    const data = await response.json();
    
    // Convert Anthropic response back to OpenAI format
    if (provider === 'claude') {
      res.json({
        id: data.id,
        choices: [
          {
            message: {
              role: 'assistant',
              content: data.content[0]?.text || ''
            }
          }
        ],
        usage: {
          prompt_tokens: data.usage?.input_tokens || 0,
          completion_tokens: data.usage?.output_tokens || 0,
          total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
        }
      });
    } else {
      res.json(data);
    }
  } catch (error: any) {
    console.error("LLM Error:", error);
    res.status(500).json({ error: error.message });
  }
}
