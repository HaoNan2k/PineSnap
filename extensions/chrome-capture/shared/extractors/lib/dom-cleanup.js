(() => {
  const root =
    globalThis.PineSnapCapture || (globalThis.PineSnapCapture = {});

  /**
   * 把 data-src / data-original 等懒加载占位补齐到 src，给 Defuddle 看到真实图片。
   * 同时把相对协议 //x 转成 https:。
   */
  function expandLazyImages(doc) {
    const images = doc.querySelectorAll("img");
    let touched = 0;
    for (const img of images) {
      const candidate =
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-actualsrc") ||
        img.getAttribute("data-lazy-src") ||
        img.getAttribute("data-original-src");
      if (candidate && !img.getAttribute("src")) {
        img.setAttribute(
          "src",
          candidate.startsWith("//") ? `https:${candidate}` : candidate
        );
        touched += 1;
        continue;
      }
      const currentSrc = img.getAttribute("src");
      if (currentSrc && currentSrc.startsWith("//")) {
        img.setAttribute("src", `https:${currentSrc}`);
        touched += 1;
      }
    }
    return touched;
  }

  /**
   * 移除给定 selector 列表下的节点。返回移除数量。
   */
  function removeSelectors(doc, selectors) {
    let removed = 0;
    for (const selector of selectors) {
      const nodes = doc.querySelectorAll(selector);
      for (const node of nodes) {
        node.remove();
        removed += 1;
      }
    }
    return removed;
  }

  /**
   * 去掉 URL 上常见的 utm_* / spm / from 等跟踪参数，返回新 URL string。
   * 解析失败时原样返回。
   */
  function stripTrackingParams(url) {
    try {
      const parsed = new URL(url);
      const trackingPrefixes = ["utm_", "spm", "from", "share_", "fr=", "ref"];
      const remove = [];
      for (const key of parsed.searchParams.keys()) {
        if (trackingPrefixes.some((prefix) => key.toLowerCase().startsWith(prefix))) {
          remove.push(key);
        }
      }
      for (const key of remove) parsed.searchParams.delete(key);
      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * 把过深的 <section> 嵌套（公众号常见）拍平到合理深度。返回拍平次数。
   * 只关心 wrapper：父 section 仅一个 <section> 子元素、且父级无自身直接文本节点。
   */
  function normalizeSections(doc) {
    let flattened = 0;
    const sections = doc.querySelectorAll("section");
    for (const section of sections) {
      if (
        section.children.length !== 1 ||
        section.children[0].tagName !== "SECTION"
      ) {
        continue;
      }
      const hasDirectText = Array.from(section.childNodes).some(
        (node) => node.nodeType === 3 && (node.textContent || "").trim().length > 0
      );
      if (hasDirectText) continue;
      const child = section.children[0];
      section.replaceWith(child);
      flattened += 1;
    }
    return flattened;
  }

  root.domCleanup = {
    expandLazyImages,
    removeSelectors,
    stripTrackingParams,
    normalizeSections,
  };
})();
