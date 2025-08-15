// --- API 配置 ---
const TCPING_API_URL = 'https://api.sdbj.top/api/tcping';
const TCPING_API_KEY = '';
const IPINFO_API_URL = 'https://api.sdbj.top/api/chunzhenip';
const IPINFO_API_KEY = '';
const SITETDK_API_URL = 'https://api.sdbj.top/api/sitetdk';
const SITETDK_API_KEY = '';
const KUGOU_API_URL = 'https://api.sdbj.top/api/kugou';
const KUGOU_API_KEY = '';

// --- 核心逻辑 ---

/**
 * [功能1] 处理 IP/域名 查询
 * @param {string} userInput - 用户输入的 IP 或域名
 */
async function handleIpQuery(userInput) {
  const headers = { 'Content-Type': 'text/html; charset=utf-8' };
  try {
    const tcpingPromise = fetch(`${TCPING_API_URL}?type=tcping&reqnum=3&url=${userInput}&apiKey=${TCPING_API_KEY}`).then(r => r.ok ? r.json() : Promise.reject(`TCPing API Error: ${r.status}`));
    const siteTdkPromise = fetch(`${SITETDK_API_URL}?url=${userInput}&apiKey=${SITETDK_API_KEY}`).then(r => r.ok ? r.json() : null).catch(() => null);
    const [tcpingData, siteTdkData] = await Promise.all([tcpingPromise, siteTdkPromise]);

    let ipInfoData = null;
    if (tcpingData?.data?.ip) {
      const ipInfoResponse = await fetch(`${IPINFO_API_URL}?ip=${tcpingData.data.ip}&apiKey=${IPINFO_API_KEY}`);
      ipInfoData = ipInfoResponse.ok ? await ipInfoResponse.text() : `查询失败: ${ipInfoResponse.status}`;
    }

    const ipResults = { tcpingData, ipInfoData, siteTdkData };
    return new Response(generateHtml({ ipQuery: userInput, ipData: ipResults }), { headers });
  } catch (error) {
    return new Response(generateHtml({ ipQuery: userInput, error: error.message }), { headers, status: 500 });
  }
}

/**
 * [功能2] 处理音乐搜索
 * @param {string} songName - 用户输入的歌曲名
 */
async function handleMusicQuery(songName) {
  const headers = { 'Content-Type': 'text/html; charset=utf-8' };
  try {
    const response = await fetch(`${KUGOU_API_URL}?apiKey=${KUGOU_API_KEY}&msg=${encodeURIComponent(songName)}`);
    if (!response.ok) throw new Error(`Kugou API 请求失败: ${response.status}`);
    const musicData = await response.json();
    return new Response(generateHtml({ musicQuery: songName, musicData: musicData }), { headers });
  } catch (error) {
    return new Response(generateHtml({ musicQuery: songName, error: error.message }), { headers, status: 500 });
  }
}

// 这是 Vercel Edge Function 的入口函数
export default async function handler(request) {
  const url = new URL(request.url);
  
  if (request.method === 'POST') {
    const formData = await request.formData();
    if (formData.has('ip_query')) {
      return handleIpQuery(formData.get('ip_query'));
    }
    if (formData.has('music_query')) {
      return handleMusicQuery(formData.get('music_query'));
    }
  }

  if (request.method === 'GET') {
    const musicQuery = url.searchParams.get('music');
    if (musicQuery) {
      return handleMusicQuery(musicQuery);
    }
    if (url.search && !url.search.includes('=')) {
      const ipQuery = decodeURIComponent(url.search.substring(1));
      if (ipQuery) {
        return handleIpQuery(ipQuery);
      }
    }
  }

  return new Response(generateHtml({}), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}


/**
 * HTML 生成函数 (保持不变)
 */
function generateHtml(options = {}) {
  const {
    ipQuery = '', ipData = {},
    musicQuery = '', musicData = null,
    error = null
  } = options;
  // ... (HTML生成代码保持不变)
  const { tcpingData, ipInfoData, siteTdkData } = ipData;
  const isResultPage = !!ipQuery || !!musicQuery;
  const resolvedIpForDisplay = tcpingData?.data?.ip;
  const ipError = ipQuery ? error : null;
  const musicError = musicQuery ? error : null;

  return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>多功能在线工具</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 2rem auto; padding: 0 1rem; background-color: #f8f9fa; }
        h1, h2 { color: #007bff; text-align: center; }
        h2 { border-top: 1px solid #dee2e6; padding-top: 2rem; margin-top: 2rem; }
        .container { background-color: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 2rem; }
        .form-container { display: flex; gap: 10px; margin-bottom: 1rem; }
        input[type="text"] { flex-grow: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-size: 16px; }
        button { padding: 10px 20px; border: none; background-color: #007bff; color: white; border-radius: 4px; cursor: pointer; font-size: 16px; transition: background-color 0.3s; }
        button:hover { background-color: #0056b3; }
        .results h3 { border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-top: 1.5rem; text-align: left;}
        .error { color: #dc3545; border: 1px solid #dc3545; padding: 1rem; border-radius: 4px; background-color: #f8d7da; }
        pre { background-color: #e9ecef; padding: 15px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
        code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; }
        footer { text-align: center; margin-top: 2rem; color: #6c757d; font-size: 0.9em; }
        .loader-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(255, 255, 255, 0.8); z-index: 9999; display: none; justify-content: center; align-items: center; }
        .loader { border: 8px solid #f3f3f3; border-top: 8px solid #007bff; border-radius: 50%; width: 60px; height: 60px; animation: spin 1.5s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .music-list { list-style-type: none; padding-left: 0; }
        .music-list li { background-color: #f8f9fa; padding: 10px 15px; border-radius: 4px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
        .music-list li .song-info { font-size: 0.95em; }
        .music-list li .download-link { font-size: 0.9em; font-weight: bold; text-decoration: none; color: #28a745; }
      </style>
    </head>
    <body>
      <div id="loader-overlay" class="loader-overlay" ${isResultPage ? 'style="display: flex;"' : ''}>
        <div class="loader"></div>
      </div>

      <h1>多功能在线工具</h1>
      
      <div class="container">
        <h2>多功能查询工具</h2>
        <form method="POST" action="/" class="form-container" id="ip-form">
          <input type="text" name="ip_query" value="${ipQuery || ''}" placeholder="请输入 IP 或域名" required>
          <button type="submit">查询</button>
        </form>
        <div class="results">
          ${ipError ? `<div class="error"><strong>查询出错：</strong><br>${ipError}</div>` : ''}
          ${tcpingData ? `<h3>TCPing 结果</h3><pre><code>${JSON.stringify(tcpingData, null, 2)}</code></pre>` : ''}
          ${ipInfoData ? `<h3>IP 地理位置信息 (查询IP: ${resolvedIpForDisplay || 'N/A'})</h3><pre><code>${ipInfoData}</code></pre>` : ''}
          ${siteTdkData ? `<h3>网站信息 (TDK)</h3><pre><code>${JSON.stringify(siteTdkData, null, 2)}</code></pre>` : ''}
        </div>
      </div>

      <div class="container">
        <h2>音乐搜索工具</h2>
        <form method="POST" action="/" class="form-container" id="music-form">
          <input type="text" name="music_query" value="${musicQuery || ''}" placeholder="请输入歌曲名称" required>
          <button type="submit">搜索</button>
        </form>
        <div class="results">
          ${musicError ? `<div class="error"><strong>查询出错：</strong><br>${musicError}</div>` : ''}
          ${musicData && musicData.musicarr ? `
            <h3>搜索结果: ${musicData.msg || ''}</h3>
            <ul class="music-list">
              ${musicData.musicarr.map(song => `
                <li>
                  <span class="song-info">${song.songname || '未知歌名'} - <strong>${song.singer || '未知歌手'}</strong></span>
                  ${song.mp3 && song.mp3.toLowerCase().startsWith('http') ?
                    `<a href="${song.mp3}" class="download-link" download="${song.songname || 'song'}.mp3" target="_blank" rel="noopener noreferrer">下载</a>` :
                    `<span>链接无效</span>`
                  }
                </li>
              `).join('')}
            </ul>
          ` : ''}
          ${musicData && !musicData.musicarr ? `<p>${musicData.msg || '未搜索到相关歌曲。'}</p>`: ''}
        </div>
      </div>

      <footer><p>由 Cloudflare Workers 强力驱动</p></footer>

      <script>
        const loader = document.getElementById('loader-overlay');
        document.querySelectorAll('form').forEach(form => {
          form.addEventListener('submit', function() {
            if (form.checkValidity() && loader) {
              loader.style.display = 'flex';
            }
          });
        });
        if (${isResultPage}) {
          document.getElementById('loader-overlay').style.display = 'none';
        }
      </script>
    </body>
    </html>
  `;
}