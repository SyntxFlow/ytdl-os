import axios from "axios";
import * as cheerio from "cheerio";

const BASE = "https://ytmp3.so/en/youtube-4k-downloader"
const EMBED = "https://www.youtube.com/oembed?type=json&url=URLNYA"
const DOWNLOAD = "https://p.oceansaver.in/ajax/download.php"
const REG = /\&api=(\w+)\&/gi;
const FORMAT = [
  "mp3",
  "m4a",
  "webm",
  "aac",
  "flac",
  "opus",
  "ogg",
  "wav",

  "360",
  "480",
  "720",
  "1080",
  "1440",
  "4k"
]

class YTDL {
  constructor() {
    this.link = "";
  }

  async _getApi() {
    let api = "";

    const res = await axios({
      url: BASE,
      method: "GET",
    });

    const mth = res.data.match(REG);
    if (mth) {
      api = mth[1]
    }

    return api
  }

  async Info(link) {
    this.link = link;
    const res = await axios({
      url: EMBED.replace("URLNYA", link),
      method: "GET",
      responseType: "json"
    });

    return res.data;
  }

  async Dl(reso) {
    let response = {};

    if (!FORMAT.includes(reso)) {
      return console.log("[ ERROR ] Format tidak ada!")
    }
    const api = await this._getApi();
    const res = await axios({
      url: DOWNLOAD,
      method: "GET",
      responseType: "json",
      params: {
        copyright: "0",
        format: reso,
        url: this.link,
        api
      }
    });
    
    while (true) {
      const wit = await axios({
        url: res.data.progress_url,
        method: "GET",
        responseType: "json",
      });
      console.log("[ DOWNLOAD ] " + wit.data.text)

      if (wit.data.progress > 999 && wit.data.success == 1) {
        response = wit.data
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 5_000)) // Jeda 5 detik
    }

    return response;
  }
}

// Contoh penggunaan
(async () => {
  const LINK = "https://youtu.be/OT9EfxOHzOs?si=8z8zyeYV8YN78_ZB"
  const yt = new YTDL()

  // Mendapatkan info video
  const info = await yt.Info(LINK)
  console.log(info);

  // Mendapatkan link video
  const reso = "360";
  const video = await yt.Dl(reso)
  console.log(video)
})()