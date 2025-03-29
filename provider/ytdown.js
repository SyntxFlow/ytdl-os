import axios from "axios";

const EMBED = "https://www.youtube.com/oembed?type=json&url=URLNYA"
const DOWNLOAD = "https://p.oceansaver.in/ajax/download.php"
const FORMAT = [
  "mp3",
  "m4a",
  "360",
  "480",
  "720",
  "1080",
  "4k",
  "8k",
  "webm_audio",
  "aac",
  "flac",
  "opus",
  "wav"
]

class YTDL {
  constructor() {
    this.link = "";
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
    const res = await axios({
      url: DOWNLOAD,
      method: "GET",
      responseType: "json",
      params: {
        button: "1",
        start: "1",
        end: "1",
        format: reso,
        iframe_source: "https://www.y2down.app",
        url: this.link
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
  const LINK = "https://youtu.be/mFsLkRrb6V0?si=ulklGoDra_z0yZDz"
  const yt = new YTDL()

  // Mendapatkan info video
  const info = await yt.Info(LINK)
  console.log(info);

  // Mendapatkan link video
  const reso = "360";
  const video = await yt.Dl(reso)
  console.log(video)
})()