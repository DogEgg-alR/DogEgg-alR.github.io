const app = Vue.createApp({
    mixins: Object.values(mixins),
    data() {
        return {
            loading: true,
            hiddenMenu: false,
            showMenuItems: false,
            menuColor: false,
            scrollTop: 0,
            renderers: [],
        };
    },
    created() {
        /* 加载遮罩的隐藏时机：
           以前是等 window.load（要等齐所有图片/字体/CDN 资源，动辄几秒），
           所以进站要看好几秒的 LOADING。
           现在改成 DOM 一就绪、再缓冲 0.25 秒就撤掉遮罩，
           首屏立刻可见；万一有资源特别慢，window.load 那次会兜底再撤一次。 */
        let done = () => {
            this.loading = false;
        };
        if (document.readyState === "complete" || document.readyState === "interactive") {
            setTimeout(done, 250);
        } else {
            document.addEventListener("DOMContentLoaded", () => setTimeout(done, 250));
            window.addEventListener("load", done);
        }
    },
    mounted() {
        window.addEventListener("scroll", this.handleScroll, true);
        this.render();
    },
    methods: {
        render() {
            for (let i of this.renderers) i();
        },
        handleScroll() {
            let wrap = this.$refs.homePostsWrap;
            let newScrollTop = document.documentElement.scrollTop;
            if (this.scrollTop < newScrollTop) {
                this.hiddenMenu = true;
                this.showMenuItems = false;
            } else this.hiddenMenu = false;
            if (wrap) {
                if (newScrollTop <= window.innerHeight - 100) this.menuColor = true;
                else this.menuColor = false;
                if (newScrollTop <= 400) wrap.style.top = "-" + newScrollTop / 5 + "px";
                else wrap.style.top = "-80px";
            }
            this.scrollTop = newScrollTop;
        },
    },
});
app.mount("#layout");
