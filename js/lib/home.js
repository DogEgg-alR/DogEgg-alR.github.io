mixins.home = {
    mounted() {
        /* 首页大图（可能 1MB 以上）不再"设上就等"：
           先让首屏文字立刻出现，图片自己在后台下载，下载完再淡入。
           加速源失败时自动回退到原站地址，避免一片空白。 */
        let background = this.$refs.homeBackground;
        let images = background.dataset.images.split(",");
        let url = images[Math.floor(Math.random() * images.length)];

        let show = (src) => {
            background.style.backgroundImage = `url('${src}')`;
            background.classList.add("loaded");
        };

        /* 把加速地址还原成站内地址，用作兜底 */
        let fallbackOf = (src) =>
            src.replace(/^https?:\/\/[^/]+\/gh\/[^/]+\/[^@/]+@[^/]+\//, "/");

        let load = (src, allowFallback) => {
            let img = new Image();
            img.onload = () => show(src);
            img.onerror = () => {
                let fb = fallbackOf(src);
                if (allowFallback && fb !== src) load(fb, false);
                else show(src); // 两个都不行也别一直空着
            };
            img.src = src;
        };
        load(url, true);

        this.menuColor = true;
    },
    methods: {
        homeClick() {
            window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
        },
    },
};
