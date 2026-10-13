/* ============================================================
 * 放大看图：点开的图片可以缩放、拖动
 * ------------------------------------------------------------
 * 电脑：滚轮缩放、按住拖动平移、双击在小图/放大之间切换
 * 手机：双指捏合缩放、单指拖动平移、双击在小图/放大之间切换
 *       单击图片仍然是「关掉」（放大的时候单击不会关，免得误触）
 *
 * 这个文件配合 scripts/image-zoom.js（负责把小脚本和样式挂到页面上）。
 * 不想要：删掉 scripts/image-zoom.js 和本文件，重新发布。
 * ============================================================ */
(function () {
    "use strict";

    var MAX_SCALE = 6; // 最多放大到几倍
    var ZOOM_STEP = 2.5; // 双击放大的倍数
    var DOUBLE_TAP_MS = 300;

    var preview = null;
    var img = null;
    var scale = 1;
    var tx = 0;
    var ty = 0;
    var baseL = 0; // 未缩放时图片左上角在屏幕上的位置
    var baseT = 0;
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startY = 0;
    var startTx = 0;
    var startTy = 0;
    var pinch = null;
    var lastTap = 0;
    var tapTimer = null;

    function grab() {
        if (!preview) preview = document.getElementById("preview");
        if (!img) img = document.getElementById("preview-content");
        return !!(preview && img);
    }

    function isOpen() {
        if (!grab()) return false;
        return window.getComputedStyle(preview).display !== "none";
    }

    function apply(animate) {
        if (!grab()) return;
        img.style.transition = animate === false ? "none" : "";
        img.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + scale + ")";
        img.classList.toggle("is-zoomed", scale > 1.01);
    }

    /* 量一下「没缩放时」图片在哪：先把 transform 清掉再量 */
    function measureBase() {
        if (!grab()) return;
        var prev = img.style.transform;
        img.style.transform = "none";
        var r = img.getBoundingClientRect();
        baseL = r.left;
        baseT = r.top;
        img.style.transform = prev;
    }

    function reset(animate) {
        scale = 1;
        tx = 0;
        ty = 0;
        pinch = null;
        dragging = false;
        moved = false;
        if (!grab()) return;
        measureBase();
        apply(animate);
    }

    /* 别把图片拖到看不见 */
    function clampPan() {
        if (!grab()) return;
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var w = img.offsetWidth * scale;
        var h = img.offsetHeight * scale;
        var minTx, maxTx, minTy, maxTy;
        if (w <= vw) {
            minTx = maxTx = (vw - w) / 2 - baseL;
        } else {
            minTx = vw - w - baseL;
            maxTx = -baseL;
        }
        if (h <= vh) {
            minTy = maxTy = (vh - h) / 2 - baseT;
        } else {
            minTy = vh - h - baseT;
            maxTy = -baseT;
        }
        tx = Math.min(Math.max(tx, minTx), maxTx);
        ty = Math.min(Math.max(ty, minTy), maxTy);
    }

    /* 以屏幕上 (px,py) 这个点为锚点缩放 */
    function zoomAt(px, py, factor) {
        if (!grab()) return;
        var r = img.getBoundingClientRect();
        var s2 = Math.min(MAX_SCALE, Math.max(1, scale * factor));
        if (Math.abs(s2 - scale) < 0.001) return;
        var ox = r.left - tx;
        var oy = r.top - ty;
        var lx = (px - r.left) / scale;
        var ly = (py - r.top) / scale;
        tx = px - ox - lx * s2;
        ty = py - oy - ly * s2;
        scale = s2;
        if (scale <= 1.01) {
            scale = 1;
            tx = 0;
            ty = 0;
        }
        clampPan();
        apply(false);
    }

    function toggleZoom(px, py) {
        if (scale > 1.01) {
            scale = 1;
            tx = 0;
            ty = 0;
            apply(true);
        } else {
            zoomAt(px, py, ZOOM_STEP);
        }
    }

    /* 让预览里那张图关掉（跟主题原来「点一下关掉」的效果一样） */
    function closePreview() {
        if (!grab()) return;
        preview.dispatchEvent(new MouseEvent("click", { bubbles: false, cancelable: true }));
    }

    function distance(touches) {
        var dx = touches[0].clientX - touches[1].clientX;
        var dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy) || 1;
    }

    function midpoint(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        };
    }

    /* ---------- 打开预览时复位 ---------- */
    document.addEventListener(
        "click",
        function (e) {
            var t = e.target;
            if (!isOpen()) return;

            if (t === img) {
                /* 预览里的图片：自己处理，不让主题「点一下就关」 */
                e.stopImmediatePropagation();
                e.preventDefault();

                if (moved) {
                    moved = false;
                    return;
                }
                var now = Date.now();
                if (now - lastTap < DOUBLE_TAP_MS) {
                    clearTimeout(tapTimer);
                    lastTap = 0;
                    toggleZoom(e.clientX || window.innerWidth / 2, e.clientY || window.innerHeight / 2);
                } else {
                    lastTap = now;
                    clearTimeout(tapTimer);
                    tapTimer = setTimeout(function () {
                        if (scale <= 1.01) closePreview();
                    }, DOUBLE_TAP_MS - 20);
                }
            }
        },
        true
    );

    /* 页面里的图片被点击 = 要打开预览了，先把缩放复位 */
    document.addEventListener(
        "click",
        function (e) {
            var t = e.target;
            if (t && t.tagName === "IMG" && t !== img) {
                setTimeout(function () {
                    reset(false);
                    setTimeout(measureBase, 60);
                }, 0);
            }
        },
        true
    );

    /* ---------- 电脑：滚轮 + 拖动 ---------- */
    document.addEventListener(
        "wheel",
        function (e) {
            if (!isOpen() || !grab()) return;
            if (e.target !== img && e.target !== preview) return;
            e.preventDefault();
            zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
        },
        { passive: false }
    );

    document.addEventListener("mousedown", function (e) {
        if (!grab() || e.target !== img || scale <= 1.01) return;
        dragging = true;
        moved = false;
        startX = e.clientX;
        startY = e.clientY;
        startTx = tx;
        startTy = ty;
        e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
        if (!dragging || !grab()) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        tx = startTx + dx;
        ty = startTy + dy;
        clampPan();
        apply(false);
    });

    document.addEventListener("mouseup", function () {
        dragging = false;
    });

    /* ---------- 手机：双指缩放 + 单指拖动 ---------- */
    document.addEventListener(
        "touchstart",
        function (e) {
            if (!isOpen() || !grab()) return;
            if (e.touches.length >= 2) {
                var r = img.getBoundingClientRect();
                var m = midpoint(e.touches);
                pinch = {
                    d: distance(e.touches),
                    sx: scale,
                    tx: tx,
                    ty: ty,
                    ox: r.left - tx,
                    oy: r.top - ty,
                    lx: (m.x - r.left) / scale,
                    ly: (m.y - r.top) / scale,
                };
                dragging = false;
            } else if (e.touches.length === 1 && scale > 1.01) {
                dragging = true;
                moved = false;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startTx = tx;
                startTy = ty;
            }
        },
        { passive: true }
    );

    document.addEventListener(
        "touchmove",
        function (e) {
            if (!isOpen() || !grab()) return;
            if (pinch && e.touches.length >= 2) {
                e.preventDefault();
                var m = midpoint(e.touches);
                var s2 = Math.min(MAX_SCALE, Math.max(1, (pinch.sx * distance(e.touches)) / pinch.d));
                tx = m.x - pinch.ox - pinch.lx * s2;
                ty = m.y - pinch.oy - pinch.ly * s2;
                scale = s2;
                if (scale <= 1.01) {
                    scale = 1;
                    tx = 0;
                    ty = 0;
                }
                clampPan();
                apply(false);
                moved = true;
            } else if (dragging && e.touches.length === 1) {
                e.preventDefault();
                var dx = e.touches[0].clientX - startX;
                var dy = e.touches[0].clientY - startY;
                if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
                tx = startTx + dx;
                ty = startTy + dy;
                clampPan();
                apply(false);
            }
        },
        { passive: false }
    );

    document.addEventListener(
        "touchend",
        function (e) {
            if (e.touches.length === 0) {
                pinch = null;
                dragging = false;
            } else if (e.touches.length === 1) {
                /* 从双指松成单指：接着拖动 */
                pinch = null;
                if (scale > 1.01) {
                    dragging = true;
                    moved = true;
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    startTx = tx;
                    startTy = ty;
                }
            }
        },
        { passive: true }
    );

    /* 图片真正加载完（尺寸变化）之后再量一次基准位置 */
    document.addEventListener(
        "load",
        function (e) {
            if (e.target && e.target.id === "preview-content" && isOpen()) {
                setTimeout(function () {
                    measureBase();
                    apply(false);
                }, 30);
            }
        },
        true
    );
})();
