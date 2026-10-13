const app = Vue.createApp({
    mixins: Object.values(mixins),
    data() {
        return {
            loading: true,
            hiddenMenu: false,
            showMenuItems: false,
            menuColor: false,
            scrollTop: 0,
            menuScrollAcc: 0,
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
            let diff = newScrollTop - this.scrollTop;

            /* 导航栏收起/弹出的判断：
               原来是「只要往下滚了哪怕 1px 就收起」，手机上惯性滚动、
               地址栏收起都会让 scrollTop 抖 1~2px，于是导航栏一闪一闪
               ——刚滑出来又被收回去。
               现在改成带门槛：往下累计 12px 才收，往上累计 4px 就出来，
               页面最上面 80px 以内永远显示。 */
            if (diff > 0 && this.menuScrollAcc < 0) this.menuScrollAcc = 0;
            if (diff < 0 && this.menuScrollAcc > 0) this.menuScrollAcc = 0;
            this.menuScrollAcc = (this.menuScrollAcc || 0) + diff;

            if (newScrollTop <= 80) {
                this.hiddenMenu = false;
                this.menuScrollAcc = 0;
            } else if (this.menuScrollAcc > 12) {
                this.hiddenMenu = true;
                this.showMenuItems = false;
                this.menuScrollAcc = 0;
            } else if (this.menuScrollAcc < -4) {
                this.hiddenMenu = false;
                this.menuScrollAcc = 0;
            }

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
