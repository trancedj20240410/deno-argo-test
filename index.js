// index.js
// 导入 Deno 的标准库和内置模块
import { copy } from 'https://deno.land/std@0.224.0/io/copy.ts';
import { resolve, join } from "https://deno.land/std@0.217.0/path/mod.ts";
import * as DenoAPI from "https://deno.land/std@0.217.0/version.ts";

// 使用 Deno.env.get() 获取环境变量
// 优先使用环境变量中的路径，如果都没有，则回退到 Deno.cwd()
const TEMP_DIR = Deno.env.get("TEMPDIR") || Deno.env.get("TMPDIR") || "/var/tmp";
const FILE_PATH = Deno.env.get("FILE_PATH") || TEMP_DIR || Deno.cwd();
const projectPageURL = Deno.env.get("URL") || '';
const intervalInseconds = Deno.env.get("TIME") || 120;
const UUID = Deno.env.get("UUID") || '89c13786-25aa-4520-b2e7-12cd60fb5202';
const NEZHA_SERVER = Deno.env.get("NEZHA_SERVER") || 'nz.abc.cn';
const NEZHA_PORT = Deno.env.get("NEZHA_PORT") || '5555';
const NEZHA_KEY = Deno.env.get("NEZHA_KEY") || '';
const ARGO_DOMAIN = Deno.env.get("ARGO_DOMAIN") || '';
const ARGO_AUTH = Deno.env.get("ARGO_AUTH") || '';
const CFIP = Deno.env.get("CFIP") || 'na.ma';
const CFPORT = Deno.env.get("CFPORT") || 443;
const NAME = Deno.env.get("NAME") || 'Vls';
const ARGO_PORT = Deno.env.get("ARGO_PORT") || 8080;
const PORT = Deno.env.get("SERVER_PORT") || Deno.env.get("PORT") || 3000;

// 生成 xr-ay 配置文件 (直接在代码中定义)
const config = {
    log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
    inbounds: [
        { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 3001 }, { path: "/vless-argo", dest: 3002 }, { path: "/vmess-argo", dest: 3003 }, { path: "/trojan-argo", dest: 3004 }] }, streamSettings: { network: 'tcp' } },
        { port: 3001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "tcp", security: "none" } },
        { port: 3002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
        { port: 3003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
        { port: 3004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan-argo" } }, sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    ],
    dns: { servers: ["https+local://8.8.8.8/dns-query"] },
    outbounds: [{ protocol: "freedom", tag: "direct" }, { protocol: "blackhole", tag: "block" }]
};

// 判断系统架构
function getSystemArchitecture() {
    const arch = Deno.build.arch;
    if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
        return 'arm';
    } else {
        return 'amd';
    }
}

// 下载对应系统架构的依赖文件 (修改为直接返回二进制数据)
async function downloadFile(fileName, fileUrl) {
    try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Download ${fileName} failed: ${response.status} ${response.statusText}`);
        }
        return response.arrayBuffer(); // 直接返回二进制数据
    } catch (error) {
        console.error(`Download ${fileName} failed: ${error.message}`);
        throw error; // Re-throw the error to be caught by the caller
    }
}

// 根据架构获取文件
function getFilesForArchitecture(architecture) {
    if (architecture === 'arm') {
        return [
            { fileName: 'npm', fileUrl: 'https://cdn.jsdelivr.net/npm/nezha-agent@0.15.4/bin/nezha-agent_linux_arm' },
            { fileName: 'web', fileUrl: 'https://github.com/fatedier/frp/releases/download/v0.58.0/frp_0.58.0_linux_arm.tar.gz' },
            { fileName: 'bot', fileUrl: 'https://workers.cloudflare.com/get_binary/cf_tunnel_arm' },
        ];
    } else if (architecture === 'amd') {
        return [
            { fileName: 'npm', fileUrl: 'https://cdn.jsdelivr.net/npm/nezha-agent@0.15.4/bin/nezha-agent_linux_amd64' },
            { fileName: 'web', fileUrl: 'https://github.com/fatedier/frp/releases/download/v0.58.0/frp_0.58.0_linux_amd64.tar.gz' },
            { fileName: 'bot', fileUrl: 'https://workers.cloudflare.com/get_binary/cf_tunnel_amd64' },
        ];
    } else {
        return [];
    }
}

// 下载并运行依赖文件 (修改为在内存中执行)
async function downloadFilesAndRun() {
    const architecture = getSystemArchitecture();
    const filesToDownload = getFilesForArchitecture(architecture);

    if (filesToDownload.length === 0) {
        console.log(`Can't find a file for the current architecture`);
        return;
    }

    try {
        const downloadedFiles = await Promise.all(filesToDownload.map(fileInfo => downloadFile(fileInfo.fileName, fileInfo.fileUrl)));

        // 运行命令 (假设顺序是 npm, web, bot)
        const commands = [
            { cmd: ['npm'], args: ["-s", `${NEZHA_SERVER}:${NEZHA_PORT}`, "-p", NEZHA_KEY, NEZHA_TLS ? '--tls' : ''], options: { stdin: "piped", stdout: 'inherit', stderr: 'inherit' } },
            { cmd: ['web'], args: [], options: { stdin: "piped", stdout: 'inherit', stderr: 'inherit', env: { "FILE_PATH": FILE_PATH, "PORT": PORT, "ARGO_DOMAIN": ARGO_DOMAIN, "CFIP": CFIP, "CFPORT": CFPORT, "NAME": NAME } } },
            {
                cmd: ['bot'],
                args: ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)
                    ? `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`.split(" ")
                    : `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${join(FILE_PATH, 'boot.log')} --loglevel info --url http://localhost:${ARGO_PORT}`.split(" "), // 假设不支持 TunnelSecret
                options: { stdin: "piped", stdout: 'inherit', stderr: 'inherit' }
            }
        ];

        for (let i = 0; i < downloadedFiles.length; i++) {
            const command = new Deno.Command(commands[i].cmd[0], {
                ...commands[i].options,
                args: commands[i].args,
                input: downloadedFiles[i] // 将二进制数据作为 stdin
            });

            // 启动进程，但不等待它完成
            command.spawn();
            console.log(`${commands[i].cmd[0]} is running (in memory)`);
        }

        // 运行 xr-ay (假设 xr-ay 支持从 stdin 读取配置)
        const xray = new Deno.Command('xr-ay', { // 假设 xr-ay 在 PATH 中
            args: ["run", "-config", "/dev/stdin"], // 尝试从 stdin 读取配置
            stdin: "piped",
            stdout: "inherit",
            stderr: "inherit",
        });

        const xrayProcess = xray.spawn();
        console.log(`xr-ay is running (in memory, config from stdin)`);

        // 将配置写入 xr-ay 的 stdin
        const configString = JSON.stringify(config, null, 2);
        const encoder = new TextEncoder();
        await xrayProcess.stdin.write(encoder.encode(configString));
        xrayProcess.stdin.close();


    } catch (error) {
        console.error(`Error downloading or running files: ${error}`);
    }
}

// 获取固定隧道json (修改为不写入文件)
async function argoType() {
    if (!ARGO_AUTH || !ARGO_DOMAIN) {
        console.log("ARGO_DOMAIN or ARGO_AUTH variable is empty, use quick tunnels");
        return;
    }

    if (ARGO_AUTH.includes('TunnelSecret')) {
        console.log("ARGO_AUTH includes TunnelSecret, skip related steps");
    } else {
        console.log("ARGO_AUTH mismatch TunnelSecret,use token connect to tunnel");
    }
}

// 提取域名 (修改为不写入文件)
async function extractDomains() {
    try {
        const response = await fetch(`https://raw.githubusercontent.com/MaZhiGuo/DomainList/main/list.txt`);
        if (!response.ok) {
            throw new Error(`Failed to fetch domain list: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        const domains = text.split('\n').filter(line => line.trim() !== '');
        return domains;
    } catch (error) {
        console.error(`Error fetching or processing domain list: ${error}`);
        return []; // 返回空数组
    }
}

// 生成链接 (修改为不写入文件)
async function generateLinks(argo_domain) {
    const domains = await extractDomains();
    if (domains.length === 0) {
        console.log('No domains to generate links');
        return ''; // 返回空字符串
    }

    let subTxt = '';
    if (argo_domain) {
        const vlessLink = `vless://${UUID}@${argo_domain}:${CFPORT}?encryption=none&security=tls&sni=${CFIP}&fp=randomized&type=ws&path=/vless-argo#${NAME}-Vless`;
        const vmessLink = `vmess://${btoa(JSON.stringify({ add: argo_domain, aid: "0", host: CFIP, id: UUID, net: "ws", path: "/vmess-argo", port: CFPORT, ps: NAME + "-Vmess", tls: "tls", type: "none", v: "2" }))}`;
        const trojanLink = `trojan://${UUID}@${argo_domain}:${CFPORT}?security=tls&sni=${CFIP}&fp=chrome&type=ws&path=/trojan-argo#${NAME}-Trojan`;
        subTxt = `${vlessLink}\n${vmessLink}\n${trojanLink}`;
    }

    for (const domain of domains) {
        const vlessLink = `vless://${UUID}@${domain}:${CFPORT}?encryption=none&security=tls&sni=${CFIP}&fp=randomized&type=ws&path=/vless#${NAME}-Vless`;
        const vmessLink = `vmess://${btoa(JSON.stringify({ add: domain, aid: "0", host: CFIP, id: UUID, net: "ws", path: "/", port: CFPORT, ps: NAME + "-Vmess", tls: "tls", type: "none", v: "2" }))}`;
        const trojanLink = `trojan://${UUID}@${domain}:${CFPORT}?security=tls&sni=${CFIP}&fp=chrome&type=ws&path=/#${NAME}-Trojan`;
        subTxt += `\n${vlessLink}\n${vmessLink}\n${trojanLink}`;
    }

    // 打印 subTxt 内容到控制台 (base64 编码)
    console.log(btoa(subTxt));
    return subTxt; // 直接返回 subTxt
}

// 定时任务 (修改为不写入文件)
async function scheduleTask(intervalInseconds, task) {
    while (true) {
        await task();
        await new Promise((resolve) => setTimeout(resolve, intervalInseconds * 1000));
    }
}

// 启动服务器 (修改为使用缓存的 subTxt)
async function startserver() {
    await argoType();
    scheduleTask(intervalInseconds, async () => {
        await extractDomains();
        //  visitProjectPage(); // Initial visit.  No need, handled by interval now.
    });

    // 缓存 subTxt 的 base64 编码
    let cachedSubTxt = '';

    // 使用 Deno 的 HTTP server
    const handler = async (request) => {
        const url = new URL(request.url);
        if (url.pathname === "/") {
            return new Response("Hello world!");
        } else if (url.pathname === "/sub") {
            // 从缓存中获取
            if (!cachedSubTxt) {
                cachedSubTxt = await generateLinks(ARGO_DOMAIN || '').then(btoa);
            }
            return new Response(cachedSubTxt, {
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        }
        return new Response("Not Found", { status: 404 });
    };

    Deno.serve({ port: PORT }, handler);
}

await downloadFilesAndRun(); // 放在最后启动
await startserver();
