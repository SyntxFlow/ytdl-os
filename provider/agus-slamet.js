import WebSocket from "ws";
import fs from "node:fs";

const WSS = "wss://agusslamet-ytdl.hf.space/sock";
// const WSS = "ws://localhost:7860/sock";

class YTDL {
  constructor() {
    this.isConnect = false;
    this.ws;
    this.mamahAkuTakut = [];
    this.result = {};
    this.link = "";
    this.resolver;
  }

  _connect() {
    return new Promise(resolve => {
      if (this.isConnect) {
        resolve()
      }
      this.ws = this.isConnect ? this.ws : new WebSocket(WSS);
      this.ws.on("open", () => {
        this.isConnect = true;
        console.log("[ SOCK ] Open.");
        resolve()
      });
      this.ws.on("message", (chunk) => {
        this._handleMessage(chunk)
      })
    })
  }

  _handleMessage(chunk) {
    const txt = chunk.toString();

    if (/\[info\]|\[youtube\]/gi.test(txt)) {
      console.log(txt)
    }
    if (txt != "2") {
      try {
        const dummy = JSON.parse(txt);

        if (dummy?.video || dummy?.audio) {
          this.result = dummy;
          this.resolver()
        }

        this.mamahAkuTakut = dummy.Format.filter(v => (v.Extension == "mp4") && v.FileSize != "");

        this.result = {
          ...dummy,
          Format: this.mamahAkuTakut
        }
        this.resolver()
      } catch (error) {
      }
    }
  }

  async Info(link) {
    this.link = link;
    await this._connect();

    const payload = {
      "cmd": "info",
      "payload": {
        "url": link,
      }
    }

    this.ws.send(JSON.stringify(payload));
    await new Promise(resolve => this.resolver = resolve)

    return this.result
  }

  async Dl(resoId) {
    await this._connect();

    const payload = {
      "cmd": "download",
      "payload": {
        "url": this.link,
        "res": resoId,
        "mp3": "140"
      }
    }

    this.ws.send(JSON.stringify(payload));
    await new Promise(resolve => this.resolver = resolve)
    this.ws.close()

    return this.result
  }
}

// Contoh penggunaan
(async () => {
  const LINK = "https://youtu.be/EpldEx6XrAI?si=ixCGs1bJ8uY9uVtj"
  const yt = new YTDL()

  // Mendapatkan info video
  const info = await yt.Info(LINK)
  await fs.writeFileSync("info.json", JSON.stringify(info, null, 2))
  console.log("\n[ INFO ] Result dari info video disimpan dalam file info.json, lihat untuk mendapatkan idnya");

  // Mendapatkan link video
  // Dapatkan id dari info diatas ( lihat info.json > Format > ID ), sesuai resolusi
  const resoID = ""; // Kosongkan ("") untuk musik
  const video = await yt.Dl(resoID)
  console.log(video)
})()