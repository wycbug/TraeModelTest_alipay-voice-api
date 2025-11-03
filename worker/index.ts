// 定义环境变量类型
type Env = {
  ALLOWED_ORIGINS: string; // 允许的来源域名，逗号分隔
  API_KEY: string; // 身份验证密钥
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const apiPath = "/api/alipay-voice";

    if (url.pathname.startsWith(apiPath)) {
      // 处理 CORS
      const allowedOrigins = env.ALLOWED_ORIGINS.split(",");
      const origin = request.headers.get("Origin") || "";
      const isAllowedOrigin = allowedOrigins.includes(origin) || allowedOrigins.includes("*");

      const corsHeaders = {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      try {
        // 记录请求信息
        const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
        const requestTime = new Date().toISOString();
        console.log(`[${requestTime}] ${clientIP} 请求 API: ${request.url}`);

        // 验证身份验证密钥
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || authHeader !== `Bearer ${env.API_KEY}`) {
          console.warn(`[${requestTime}] ${clientIP} 身份验证失败`);
          return new Response(
            JSON.stringify({ code: 401, msg: "身份验证失败" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 401,
            }
          );
        }

        const number = url.searchParams.get("number");
        const type = url.searchParams.get("type");

        // 验证必填参数
        if (!number) {
          console.warn(`[${requestTime}] ${clientIP} 缺少金额参数`);
          return new Response(
            JSON.stringify({ code: 400, msg: "请输入金额参数" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // 验证金额格式和范围
        const amount = parseFloat(number);
        if (isNaN(amount)) {
          console.warn(`[${requestTime}] ${clientIP} 无效的金额格式: ${number}`);
          return new Response(
            JSON.stringify({ code: 400, msg: "请输入有效的数字金额" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        if (amount <= 0 || amount >= 100000000000) {
          console.warn(`[${requestTime}] ${clientIP} 金额超出范围: ${amount}`);
          return new Response(
            JSON.stringify({ code: 400, msg: "金额范围必须在0到1000亿元之间" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // 调用支付宝语音 API
        const apiUrl = new URL("https://api.pearktrue.cn/api/alipay/");
        apiUrl.searchParams.set("number", number);
        if (type) {
          apiUrl.searchParams.set("type", type);
        }

        console.log(`[${requestTime}] ${clientIP} 调用支付宝语音 API: ${apiUrl.toString()}`);
        const response = await fetch(apiUrl.toString(), {
          headers: {
            "Content-Type": "application/json",
          },
          // 添加超时处理
          signal: AbortController.timeout(5000),
        });

        if (!response.ok) {
          console.error(`[${requestTime}] ${clientIP} 支付宝语音 API 返回错误: ${response.status} ${response.statusText}`);
          return new Response(
            JSON.stringify({ code: response.status, msg: "支付宝语音 API 返回错误" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: response.status,
            }
          );
        }

        const data = await response.json();

        // 如果类型是json或API返回错误，则直接返回JSON
        if (type === "json" || data.code !== 200) {
          console.log(`[${requestTime}] ${clientIP} 返回结果: ${JSON.stringify(data)}`);
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: response.status,
          });
        }

        // 否则，代理音频文件
        if (data.audiourl) {
          console.log(`[${requestTime}] ${clientIP} 代理音频文件: ${data.audiourl}`);
          const audioResponse = await fetch(data.audiourl, {
            // 添加超时处理
            signal: AbortController.timeout(10000),
          });

          if (!audioResponse.ok) {
            console.error(`[${requestTime}] ${clientIP} 获取音频文件失败: ${audioResponse.status} ${audioResponse.statusText}`);
            return new Response(
              JSON.stringify({ code: audioResponse.status, msg: "获取音频文件失败" }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: audioResponse.status,
              }
            );
          }

          const audioHeaders = new Headers(audioResponse.headers);
          
          // 添加CORS头部到音频响应
          Object.entries(corsHeaders).forEach(([key, value]) => {
            audioHeaders.set(key, value);
          });

          return new Response(audioResponse.body, {
            headers: audioHeaders,
            status: audioResponse.status,
          });
        } else {
          console.warn(`[${requestTime}] ${clientIP} 未找到音频文件`);
          return new Response(
            JSON.stringify({ code: 500, msg: "未找到音频文件" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            }
          );
        }
      } catch (error) {
        const requestTime = new Date().toISOString();
        const clientIP = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
        
        if (error.name === "TimeoutError") {
          console.error(`[${requestTime}] ${clientIP} 请求超时`);
          return new Response(
            JSON.stringify({ code: 504, msg: "请求超时" }),
            {
              headers: {
                "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "",
                "Content-Type": "application/json",
              },
              status: 504,
            }
          );
        }

        console.error(`[${requestTime}] ${clientIP} 服务器内部错误:`, error);
        return new Response(
          JSON.stringify({ code: 500, msg: "服务器内部错误", error: error.message }),
          {
            headers: {
              "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "",
              "Content-Type": "application/json",
            },
            status: 500,
          }
        );
      }
    }

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;