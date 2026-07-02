// // Runtime env loader: fetch /.env and expose SCRIPT_URL and API_KEY on window
// (function () {
//   if (typeof window === 'undefined') return;
//   fetch('/.env')
//     .then(function (res) {
//       if (!res.ok) throw new Error('No env file');
//       return res.text();
//     })
//     .then(function (text) {
//       text.split(/\r?\n/).forEach(function (line) {
//         var m = line.match(/^\s*([^=\s]+)\s*=\s*(.*)\s*$/);
//         if (!m) return;
//         var key = m[1];
//         var val = m[2];
//         if (key === 'SCRIPT_URL') window.SCRIPT_URL = val;
//         if (key === 'API_KEY') window.API_KEY = val;
//       });
//     })
//     .catch(function () {
//       // no .env served; ignore
//     });
// })();
