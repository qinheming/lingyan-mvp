import { useEffect, useMemo, useState } from "react";

function isWechatBrowser(): boolean {
  return /MicroMessenger/i.test(navigator.userAgent);
}

function isIosBrowser(): boolean {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

export function WechatBrowserNotice() {
  const shouldShow = useMemo(() => isWechatBrowser(), []);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shouldShow) return;
    document.documentElement.classList.add("wechat-browser");
    return () => document.documentElement.classList.remove("wechat-browser");
  }, [shouldShow]);

  if (!shouldShow) return null;

  const targetBrowser = isIosBrowser() ? "Safari" : "Chrome / 华为浏览器";

  async function copyLink() {
    const link = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(link);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="wechat-browser-notice" role="status">
      <div>
        <strong>微信内打开会限制跳转高德</strong>
        <p>请点右上角菜单，选择“在浏览器打开”，再用 {targetBrowser} 继续。</p>
      </div>
      <button type="button" onClick={() => void copyLink()}>
        {copied ? "已复制" : "复制链接"}
      </button>
    </div>
  );
}
