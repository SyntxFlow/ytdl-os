import undici from "undici";
import WebSocket from "ws";
import fs from "node:fs";

const SAVE_INSTA_TOKEN = "https://saveinsta.cc/api/get-token"
const SAVE_INSTA_ANALIZE = "https://saveinsta.cc/api/yt/analyze"
const SAVE_INSTA_INFO = "https://saveinsta.cc/api/yt/getvideoinfo"
const SAVE_INSTA_CONVERT = "https://saveinsta.cc/api/yt/convertfilequeue"
const SAVE_INSTA_WSS = "wss://syt.cdndl.xyz/socket.io/?EIO=4&transport=websocket"

// https://v1.yt-cdn.xyz/sv5/api/v1/downloadfile?dm=saveinsta.cc&id=67e64c4775c861d6b3156b6d&t=144p

class YTDL {
  constructor() {
    this.link = "";
    this.gData = {
      isOpen: false
    };
    this.resolver;
    this.resu = {};
    this.retry = 3;
    this.resoo = "";
  }

  async _req({ url, method = "GET", data = null, params = null, head = null, response = "json" }) {
    try {
      var headers = {};
      var param;
      var datas;

      if (head && head == "original" || head == "ori") {
        const uri = new URL(url);
        headers = {
          ...headers,
          authority: uri.hostname,
          origin: "https://" + uri.hostname,
          'Cache-Control': 'no-cache',
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
        }
      } else if (head && typeof head == "object") {
        headers = {
          ...headers,
          ...head
        };
      }
      if (params && typeof params == "object") {
        param = params;
      } else {
        param = "";
      }
      if (data) {
        datas = data
      } else {
        datas = "";
      }

      const payload = {
        method: method,
        headers: headers,
        ...(!datas ? {} : { body: JSON.stringify(datas) }),
      }

      const {
        body,
        headers: headd
      } = await undici.request(url + param, payload)

      return { body, cookie: headd["set-cookie"] };
    } catch (error) {
      console.log(error)
    }
  }

  _web() {
    return new Promise(resolve => {
      const gdd = this.gData
      let ws;
      this.resolver = resolve;

      if (gdd?.isOpen) {
        ws = gdd.ws
      } else {
        ws = new WebSocket(SAVE_INSTA_WSS, {
          headers: {
            origin: "https://saveinsta.cc",
          }
        });

        ws.on("message", (chunk) => {
          const txt = chunk.toString();
          const prefix = txt.match(/^\d+/)?.[0];

          let jsn;
          try {
            if (prefix == "0" || prefix == "40") {
              jsn = JSON.parse(txt.substring(prefix.length).replace(prefix+"{", "{").trim())
            } else {
              jsn = JSON.parse(txt.substring(prefix.length).replace(prefix+"[", "[").trim())[1]
            }
          } catch (error) {
            console.log(error)
          }

          if (jsn?.percent) {
            console.log(jsn)
          }

          if ((jsn?.sid && !jsn?.pingInterval && !jsn?.pingTimeout) || (jsn?.percent == 100)) {
            this.resu = {
              ...jsn,
              downloadUrl: `${this.gData.cdn}/api/v1/downloadfile?dm=saveinsta.cc&id=${jsn.downloadId}&t=${this.resoo}`
            }
            this.resolver({
              sid: jsn.sid,
              ws
            })
          }
        })
        ws.on("open", () => {
          ws.send("40");
        })
      }
    })
  }

  async Info(link) {
    this.link = link;
    let resp = {};
    let tr = 0;

    try {
      while (tr < this.retry) {
        tr++
        const token = await this._req({
          url: SAVE_INSTA_TOKEN,
          method: "GET"
        })
        const csrf = await token.body.json()
        const { sid, ws } = await this._web();
        const analize = await this._req({
          url: SAVE_INSTA_ANALIZE,
          method: "POST",
          data: {
            "q": link,
            "moduleType": "ytdl",
            "action": "analyzeYT",
            "clientId": sid
          },
          head: {
            "sc-token": csrf.csrfToken,
            cookie: token.cookie
          }
        })
        const analiz = await analize.body.json()
        const infos = await this._req({
          url: SAVE_INSTA_INFO,
          method: "POST",
          data: {
            "q": link,
            "moduleType": "ytdl",
            "action": "GetDataYT",
            "trackId": analiz.trackId,
            "cdn": analiz.cdn
          },
          head: {
            "sc-token": csrf.csrfToken,
            cookie: token.cookie
          }
        })
        resp = await infos.body.json()
        this.gData = {
          ...resp,
          ws,
          sid,
          isOpen: true,
          csrf: csrf.csrfToken,
          cookie: token.cookie
        }

        if (resp?.videos && !resp?.code && resp?.code != 404) {
          break;
        }
        console.log("[ RETRY ] " + tr.toString())
        console.log("[ ERROR ] " + JSON.stringify(resp))
      }

      return resp
    } catch (error) {
      throw error
    }
  }

  async Dl(reso) {
    this.resoo = reso;

    try {
      const gdd = this.gData;

      let target = {};
      outerloop:
      for (const tg of [gdd.videos.mp4s, gdd.videos.mp3s]) {
        for (const resos of tg) {
          if (resos.resolution == reso) {
            target = resos;
            break outerloop;
          }
        }
      }

      await this._req({
        url: SAVE_INSTA_CONVERT,
        method: "POST",
        data: {
          "data": target.requestId,
          "trackId": target.trackId,
          "clientId": gdd.sid
        },
        head: {
          "sc-token": gdd.csrf,
          cookie: gdd.cookie
        }
      })

      // const inf = await infos.body.json()
      await this._web();
      gdd.ws.close()
      this.gData = {}

      return this.resu
    } catch (error) {
      throw error
    }
  }
}

// Contoh penggunaan
(async () => {
  const LINK = "https://youtu.be/8UY5BGFLtK0?si=eoeUmpD76dWblB_D"
  const yt = new YTDL()

  // Mendapatkan info video
  const info = await yt.Info(LINK)
  await fs.writeFileSync("info-insta.json", JSON.stringify(info, null, 2))
  console.log("\n[ INFO ] Result dari info video disimpan dalam file info-insta.json, lihat untuk mendapatkan formatnya");

  // Mendapatkan link video
  const reso = "360p";
  const video = await yt.Dl(reso)
  console.log(video)
})()