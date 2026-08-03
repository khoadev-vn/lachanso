export const WEB_API_CONFIG = {
  screenshot: {
    providers: [
    {
      name: "wordpress-mshots",
      mode: "path",
      endpoint: "https://s.wordpress.com/mshots/v1",
      docsUrl: "https://developer.wordpress.com/docs/mshots/"
    },
    {
      name: "thum-io",
      mode: "query",
      endpoint: "https://image.thum.io/get/width/1200/crop/1600/noanimate",
      docsUrl: "https://www.thum.io/documentation/api/url"
    }]

  },
  destroylist: {
    checkEndpoint: "https://api.destroy.tools/v1/check",
    feedEndpoint: "https://api.destroy.tools/v1/feed",
    repoUrl: "https://github.com/phishdestroy/destroylist",
    rawPrimaryHostsUrl: "https://raw.githubusercontent.com/phishdestroy/destroylist/main/rootlist/formats/primary_active/hosts.txt"
  },
  vietnamOfficialScamLookup: {
    name: "Tin nhiệm mạng",
    lookupUrl: "https://tinnhiemmang.vn/website-lua-dao",
    reportUrl: "https://canhbao.khonggianmang.vn/"
  }
} as const;
