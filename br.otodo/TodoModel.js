function pad2(value) {
  return String(value).padStart(2, "0")
}

function dateAtNoon(year, month, day) {
  var date = new Date(0)
  date.setFullYear(Number(year), Number(month), Number(day))
  date.setHours(12, 0, 0, 0)
  return date
}

function keyForParts(year, month, day) {
  return String(year).padStart(4, "0") + "-" + pad2(Number(month) + 1) + "-" + pad2(day)
}

function keyForDate(date) {
  return keyForParts(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseDateKey(value) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""))
  if (!match) return null

  var year = Number(match[1])
  var month = Number(match[2]) - 1
  var day = Number(match[3])
  var parsed = dateAtNoon(year, month, day)
  if (year < 1 || parsed.getFullYear() !== year || parsed.getMonth() !== month || parsed.getDate() !== day)
    return null
  return parsed
}


function addDays(date, amount) {
  return dateAtNoon(date.getFullYear(), date.getMonth(), date.getDate() + Number(amount))
}

function addMonths(date, amount) {
  var year = date.getFullYear()
  var month = date.getMonth() + Number(amount)
  var day = date.getDate()
  var lastDay = dateAtNoon(year, month + 1, 0).getDate()
  return dateAtNoon(year, month, Math.min(day, lastDay))
}

// Expanded Unicode 17.0 categories: QV4 accepts /u but not Unicode property escapes.
// Generated from ECMAScript \p{L}, \p{N}, \p{M} and \p{P}; keep marks attached to words.
var inputWordCharacter = /[\u0030-\u0039\u0041-\u005a\u005f\u0061-\u007a\u00aa\u00b2-\u00b3\u00b5\u00b9-\u00ba\u00bc-\u00be\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376-\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u052f\u0531-\u0556\u0559\u0560-\u0588\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7\u05d0-\u05ea\u05ef-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u07fd\u0800-\u082d\u0840-\u085b\u0860-\u086a\u0870-\u0887\u0889-\u088f\u0897-\u08e1\u08e3-\u0963\u0966-\u096f\u0971-\u0983\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7-\u09c8\u09cb-\u09ce\u09d7\u09dc-\u09dd\u09df-\u09e3\u09e6-\u09f1\u09f4-\u09f9\u09fc\u09fe\u0a01-\u0a03\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a3c\u0a3e-\u0a42\u0a47-\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0af9-\u0aff\u0b01-\u0b03\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47-\u0b48\u0b4b-\u0b4d\u0b55-\u0b57\u0b5c-\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71-\u0b77\u0b82-\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bf2\u0c00-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3c-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55-\u0c56\u0c58-\u0c5a\u0c5c-\u0c5d\u0c60-\u0c63\u0c66-\u0c6f\u0c78-\u0c7e\u0c80-\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5-\u0cd6\u0cdc-\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1-\u0cf3\u0d00-\u0d0c\u0d0e-\u0d10\u0d12-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d54-\u0d63\u0d66-\u0d78\u0d7a-\u0d7f\u0d81-\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2-\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81-\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ece\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18-\u0f19\u0f20-\u0f33\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1369-\u137c\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u1715\u171f-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772-\u1773\u1780-\u17d3\u17d7\u17dc-\u17dd\u17e0-\u17e9\u17f0-\u17f9\u180b-\u180d\u180f-\u1819\u1820-\u1878\u1880-\u18aa\u18b0-\u18f5\u1900-\u191e\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19da\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1ab0-\u1add\u1ae0-\u1aeb\u1b00-\u1b4c\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1c80-\u1c8a\u1c90-\u1cba\u1cbd-\u1cbf\u1cd0-\u1cd2\u1cd4-\u1cfa\u1d00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2070-\u2071\u2074-\u2079\u207f-\u2089\u2090-\u209c\u20d0-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2150-\u2189\u2460-\u249b\u24ea-\u24ff\u2776-\u2793\u2c00-\u2ce4\u2ceb-\u2cf3\u2cfd\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099-\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u3192-\u3195\u31a0-\u31bf\u31f0-\u31ff\u3220-\u3229\u3248-\u324f\u3251-\u325f\u3280-\u3289\u32b1-\u32bf\u3400-\u4dbf\u4e00-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua672\ua674-\ua67d\ua67f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua7dc\ua7f1-\ua827\ua82c\ua830-\ua835\ua840-\ua873\ua880-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua8fd-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\ua9e0-\ua9fe\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab69\uab70-\uabea\uabec-\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe2f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc\u{10000}-\u{1000b}\u{1000d}-\u{10026}\u{10028}-\u{1003a}\u{1003c}-\u{1003d}\u{1003f}-\u{1004d}\u{10050}-\u{1005d}\u{10080}-\u{100fa}\u{10107}-\u{10133}\u{10140}-\u{10178}\u{1018a}-\u{1018b}\u{101fd}\u{10280}-\u{1029c}\u{102a0}-\u{102d0}\u{102e0}-\u{102fb}\u{10300}-\u{10323}\u{1032d}-\u{1034a}\u{10350}-\u{1037a}\u{10380}-\u{1039d}\u{103a0}-\u{103c3}\u{103c8}-\u{103cf}\u{103d1}-\u{103d5}\u{10400}-\u{1049d}\u{104a0}-\u{104a9}\u{104b0}-\u{104d3}\u{104d8}-\u{104fb}\u{10500}-\u{10527}\u{10530}-\u{10563}\u{10570}-\u{1057a}\u{1057c}-\u{1058a}\u{1058c}-\u{10592}\u{10594}-\u{10595}\u{10597}-\u{105a1}\u{105a3}-\u{105b1}\u{105b3}-\u{105b9}\u{105bb}-\u{105bc}\u{105c0}-\u{105f3}\u{10600}-\u{10736}\u{10740}-\u{10755}\u{10760}-\u{10767}\u{10780}-\u{10785}\u{10787}-\u{107b0}\u{107b2}-\u{107ba}\u{10800}-\u{10805}\u{10808}\u{1080a}-\u{10835}\u{10837}-\u{10838}\u{1083c}\u{1083f}-\u{10855}\u{10858}-\u{10876}\u{10879}-\u{1089e}\u{108a7}-\u{108af}\u{108e0}-\u{108f2}\u{108f4}-\u{108f5}\u{108fb}-\u{1091b}\u{10920}-\u{10939}\u{10940}-\u{10959}\u{10980}-\u{109b7}\u{109bc}-\u{109cf}\u{109d2}-\u{10a03}\u{10a05}-\u{10a06}\u{10a0c}-\u{10a13}\u{10a15}-\u{10a17}\u{10a19}-\u{10a35}\u{10a38}-\u{10a3a}\u{10a3f}-\u{10a48}\u{10a60}-\u{10a7e}\u{10a80}-\u{10a9f}\u{10ac0}-\u{10ac7}\u{10ac9}-\u{10ae6}\u{10aeb}-\u{10aef}\u{10b00}-\u{10b35}\u{10b40}-\u{10b55}\u{10b58}-\u{10b72}\u{10b78}-\u{10b91}\u{10ba9}-\u{10baf}\u{10c00}-\u{10c48}\u{10c80}-\u{10cb2}\u{10cc0}-\u{10cf2}\u{10cfa}-\u{10d27}\u{10d30}-\u{10d39}\u{10d40}-\u{10d65}\u{10d69}-\u{10d6d}\u{10d6f}-\u{10d85}\u{10e60}-\u{10e7e}\u{10e80}-\u{10ea9}\u{10eab}-\u{10eac}\u{10eb0}-\u{10eb1}\u{10ec2}-\u{10ec7}\u{10efa}-\u{10f27}\u{10f30}-\u{10f54}\u{10f70}-\u{10f85}\u{10fb0}-\u{10fcb}\u{10fe0}-\u{10ff6}\u{11000}-\u{11046}\u{11052}-\u{11075}\u{1107f}-\u{110ba}\u{110c2}\u{110d0}-\u{110e8}\u{110f0}-\u{110f9}\u{11100}-\u{11134}\u{11136}-\u{1113f}\u{11144}-\u{11147}\u{11150}-\u{11173}\u{11176}\u{11180}-\u{111c4}\u{111c9}-\u{111cc}\u{111ce}-\u{111da}\u{111dc}\u{111e1}-\u{111f4}\u{11200}-\u{11211}\u{11213}-\u{11237}\u{1123e}-\u{11241}\u{11280}-\u{11286}\u{11288}\u{1128a}-\u{1128d}\u{1128f}-\u{1129d}\u{1129f}-\u{112a8}\u{112b0}-\u{112ea}\u{112f0}-\u{112f9}\u{11300}-\u{11303}\u{11305}-\u{1130c}\u{1130f}-\u{11310}\u{11313}-\u{11328}\u{1132a}-\u{11330}\u{11332}-\u{11333}\u{11335}-\u{11339}\u{1133b}-\u{11344}\u{11347}-\u{11348}\u{1134b}-\u{1134d}\u{11350}\u{11357}\u{1135d}-\u{11363}\u{11366}-\u{1136c}\u{11370}-\u{11374}\u{11380}-\u{11389}\u{1138b}\u{1138e}\u{11390}-\u{113b5}\u{113b7}-\u{113c0}\u{113c2}\u{113c5}\u{113c7}-\u{113ca}\u{113cc}-\u{113d3}\u{113e1}-\u{113e2}\u{11400}-\u{1144a}\u{11450}-\u{11459}\u{1145e}-\u{11461}\u{11480}-\u{114c5}\u{114c7}\u{114d0}-\u{114d9}\u{11580}-\u{115b5}\u{115b8}-\u{115c0}\u{115d8}-\u{115dd}\u{11600}-\u{11640}\u{11644}\u{11650}-\u{11659}\u{11680}-\u{116b8}\u{116c0}-\u{116c9}\u{116d0}-\u{116e3}\u{11700}-\u{1171a}\u{1171d}-\u{1172b}\u{11730}-\u{1173b}\u{11740}-\u{11746}\u{11800}-\u{1183a}\u{118a0}-\u{118f2}\u{118ff}-\u{11906}\u{11909}\u{1190c}-\u{11913}\u{11915}-\u{11916}\u{11918}-\u{11935}\u{11937}-\u{11938}\u{1193b}-\u{11943}\u{11950}-\u{11959}\u{119a0}-\u{119a7}\u{119aa}-\u{119d7}\u{119da}-\u{119e1}\u{119e3}-\u{119e4}\u{11a00}-\u{11a3e}\u{11a47}\u{11a50}-\u{11a99}\u{11a9d}\u{11ab0}-\u{11af8}\u{11b60}-\u{11b67}\u{11bc0}-\u{11be0}\u{11bf0}-\u{11bf9}\u{11c00}-\u{11c08}\u{11c0a}-\u{11c36}\u{11c38}-\u{11c40}\u{11c50}-\u{11c6c}\u{11c72}-\u{11c8f}\u{11c92}-\u{11ca7}\u{11ca9}-\u{11cb6}\u{11d00}-\u{11d06}\u{11d08}-\u{11d09}\u{11d0b}-\u{11d36}\u{11d3a}\u{11d3c}-\u{11d3d}\u{11d3f}-\u{11d47}\u{11d50}-\u{11d59}\u{11d60}-\u{11d65}\u{11d67}-\u{11d68}\u{11d6a}-\u{11d8e}\u{11d90}-\u{11d91}\u{11d93}-\u{11d98}\u{11da0}-\u{11da9}\u{11db0}-\u{11ddb}\u{11de0}-\u{11de9}\u{11ee0}-\u{11ef6}\u{11f00}-\u{11f10}\u{11f12}-\u{11f3a}\u{11f3e}-\u{11f42}\u{11f50}-\u{11f5a}\u{11fb0}\u{11fc0}-\u{11fd4}\u{12000}-\u{12399}\u{12400}-\u{1246e}\u{12480}-\u{12543}\u{12f90}-\u{12ff0}\u{13000}-\u{1342f}\u{13440}-\u{13455}\u{13460}-\u{143fa}\u{14400}-\u{14646}\u{16100}-\u{16139}\u{16800}-\u{16a38}\u{16a40}-\u{16a5e}\u{16a60}-\u{16a69}\u{16a70}-\u{16abe}\u{16ac0}-\u{16ac9}\u{16ad0}-\u{16aed}\u{16af0}-\u{16af4}\u{16b00}-\u{16b36}\u{16b40}-\u{16b43}\u{16b50}-\u{16b59}\u{16b5b}-\u{16b61}\u{16b63}-\u{16b77}\u{16b7d}-\u{16b8f}\u{16d40}-\u{16d6c}\u{16d70}-\u{16d79}\u{16e40}-\u{16e96}\u{16ea0}-\u{16eb8}\u{16ebb}-\u{16ed3}\u{16f00}-\u{16f4a}\u{16f4f}-\u{16f87}\u{16f8f}-\u{16f9f}\u{16fe0}-\u{16fe1}\u{16fe3}-\u{16fe4}\u{16ff0}-\u{16ff6}\u{17000}-\u{18cd5}\u{18cff}-\u{18d1e}\u{18d80}-\u{18df2}\u{1aff0}-\u{1aff3}\u{1aff5}-\u{1affb}\u{1affd}-\u{1affe}\u{1b000}-\u{1b122}\u{1b132}\u{1b150}-\u{1b152}\u{1b155}\u{1b164}-\u{1b167}\u{1b170}-\u{1b2fb}\u{1bc00}-\u{1bc6a}\u{1bc70}-\u{1bc7c}\u{1bc80}-\u{1bc88}\u{1bc90}-\u{1bc99}\u{1bc9d}-\u{1bc9e}\u{1ccf0}-\u{1ccf9}\u{1cf00}-\u{1cf2d}\u{1cf30}-\u{1cf46}\u{1d165}-\u{1d169}\u{1d16d}-\u{1d172}\u{1d17b}-\u{1d182}\u{1d185}-\u{1d18b}\u{1d1aa}-\u{1d1ad}\u{1d242}-\u{1d244}\u{1d2c0}-\u{1d2d3}\u{1d2e0}-\u{1d2f3}\u{1d360}-\u{1d378}\u{1d400}-\u{1d454}\u{1d456}-\u{1d49c}\u{1d49e}-\u{1d49f}\u{1d4a2}\u{1d4a5}-\u{1d4a6}\u{1d4a9}-\u{1d4ac}\u{1d4ae}-\u{1d4b9}\u{1d4bb}\u{1d4bd}-\u{1d4c3}\u{1d4c5}-\u{1d505}\u{1d507}-\u{1d50a}\u{1d50d}-\u{1d514}\u{1d516}-\u{1d51c}\u{1d51e}-\u{1d539}\u{1d53b}-\u{1d53e}\u{1d540}-\u{1d544}\u{1d546}\u{1d54a}-\u{1d550}\u{1d552}-\u{1d6a5}\u{1d6a8}-\u{1d6c0}\u{1d6c2}-\u{1d6da}\u{1d6dc}-\u{1d6fa}\u{1d6fc}-\u{1d714}\u{1d716}-\u{1d734}\u{1d736}-\u{1d74e}\u{1d750}-\u{1d76e}\u{1d770}-\u{1d788}\u{1d78a}-\u{1d7a8}\u{1d7aa}-\u{1d7c2}\u{1d7c4}-\u{1d7cb}\u{1d7ce}-\u{1d7ff}\u{1da00}-\u{1da36}\u{1da3b}-\u{1da6c}\u{1da75}\u{1da84}\u{1da9b}-\u{1da9f}\u{1daa1}-\u{1daaf}\u{1df00}-\u{1df1e}\u{1df25}-\u{1df2a}\u{1e000}-\u{1e006}\u{1e008}-\u{1e018}\u{1e01b}-\u{1e021}\u{1e023}-\u{1e024}\u{1e026}-\u{1e02a}\u{1e030}-\u{1e06d}\u{1e08f}\u{1e100}-\u{1e12c}\u{1e130}-\u{1e13d}\u{1e140}-\u{1e149}\u{1e14e}\u{1e290}-\u{1e2ae}\u{1e2c0}-\u{1e2f9}\u{1e4d0}-\u{1e4f9}\u{1e5d0}-\u{1e5fa}\u{1e6c0}-\u{1e6de}\u{1e6e0}-\u{1e6f5}\u{1e6fe}-\u{1e6ff}\u{1e7e0}-\u{1e7e6}\u{1e7e8}-\u{1e7eb}\u{1e7ed}-\u{1e7ee}\u{1e7f0}-\u{1e7fe}\u{1e800}-\u{1e8c4}\u{1e8c7}-\u{1e8d6}\u{1e900}-\u{1e94b}\u{1e950}-\u{1e959}\u{1ec71}-\u{1ecab}\u{1ecad}-\u{1ecaf}\u{1ecb1}-\u{1ecb4}\u{1ed01}-\u{1ed2d}\u{1ed2f}-\u{1ed3d}\u{1ee00}-\u{1ee03}\u{1ee05}-\u{1ee1f}\u{1ee21}-\u{1ee22}\u{1ee24}\u{1ee27}\u{1ee29}-\u{1ee32}\u{1ee34}-\u{1ee37}\u{1ee39}\u{1ee3b}\u{1ee42}\u{1ee47}\u{1ee49}\u{1ee4b}\u{1ee4d}-\u{1ee4f}\u{1ee51}-\u{1ee52}\u{1ee54}\u{1ee57}\u{1ee59}\u{1ee5b}\u{1ee5d}\u{1ee5f}\u{1ee61}-\u{1ee62}\u{1ee64}\u{1ee67}-\u{1ee6a}\u{1ee6c}-\u{1ee72}\u{1ee74}-\u{1ee77}\u{1ee79}-\u{1ee7c}\u{1ee7e}\u{1ee80}-\u{1ee89}\u{1ee8b}-\u{1ee9b}\u{1eea1}-\u{1eea3}\u{1eea5}-\u{1eea9}\u{1eeab}-\u{1eebb}\u{1f100}-\u{1f10c}\u{1fbf0}-\u{1fbf9}\u{20000}-\u{2a6df}\u{2a700}-\u{2b81d}\u{2b820}-\u{2cead}\u{2ceb0}-\u{2ebe0}\u{2ebf0}-\u{2ee5d}\u{2f800}-\u{2fa1d}\u{30000}-\u{3134a}\u{31350}-\u{33479}\u{e0100}-\u{e01ef}]/u
var inputMarkCharacter = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7-\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u0897-\u089f\u08ca-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0981-\u0983\u09bc\u09be-\u09c4\u09c7-\u09c8\u09cb-\u09cd\u09d7\u09e2-\u09e3\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47-\u0a48\u0a4b-\u0a4d\u0a51\u0a70-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47-\u0b48\u0b4b-\u0b4d\u0b55-\u0b57\u0b62-\u0b63\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0c00-\u0c04\u0c3c\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55-\u0c56\u0c62-\u0c63\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5-\u0cd6\u0ce2-\u0ce3\u0cf3\u0d00-\u0d03\u0d3b-\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62-\u0d63\u0d81-\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2-\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0ebc\u0ec8-\u0ece\u0f18-\u0f19\u0f35\u0f37\u0f39\u0f3e-\u0f3f\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f\u109a-\u109d\u135d-\u135f\u1712-\u1715\u1732-\u1734\u1752-\u1753\u1772-\u1773\u17b4-\u17d3\u17dd\u180b-\u180d\u180f\u1885-\u1886\u18a9\u1920-\u192b\u1930-\u193b\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f\u1ab0-\u1add\u1ae0-\u1aeb\u1b00-\u1b04\u1b34-\u1b44\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1be6-\u1bf3\u1c24-\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf4\u1cf7-\u1cf9\u1dc0-\u1dff\u20d0-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099-\u309a\ua66f-\ua672\ua674-\ua67d\ua69e-\ua69f\ua6f0-\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua82c\ua880-\ua881\ua8b4-\ua8c5\ua8e0-\ua8f1\ua8ff\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9e5\uaa29-\uaa36\uaa43\uaa4c-\uaa4d\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7-\uaab8\uaabe-\uaabf\uaac1\uaaeb-\uaaef\uaaf5-\uaaf6\uabe3-\uabea\uabec-\uabed\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\u{101fd}\u{102e0}\u{10376}-\u{1037a}\u{10a01}-\u{10a03}\u{10a05}-\u{10a06}\u{10a0c}-\u{10a0f}\u{10a38}-\u{10a3a}\u{10a3f}\u{10ae5}-\u{10ae6}\u{10d24}-\u{10d27}\u{10d69}-\u{10d6d}\u{10eab}-\u{10eac}\u{10efa}-\u{10eff}\u{10f46}-\u{10f50}\u{10f82}-\u{10f85}\u{11000}-\u{11002}\u{11038}-\u{11046}\u{11070}\u{11073}-\u{11074}\u{1107f}-\u{11082}\u{110b0}-\u{110ba}\u{110c2}\u{11100}-\u{11102}\u{11127}-\u{11134}\u{11145}-\u{11146}\u{11173}\u{11180}-\u{11182}\u{111b3}-\u{111c0}\u{111c9}-\u{111cc}\u{111ce}-\u{111cf}\u{1122c}-\u{11237}\u{1123e}\u{11241}\u{112df}-\u{112ea}\u{11300}-\u{11303}\u{1133b}-\u{1133c}\u{1133e}-\u{11344}\u{11347}-\u{11348}\u{1134b}-\u{1134d}\u{11357}\u{11362}-\u{11363}\u{11366}-\u{1136c}\u{11370}-\u{11374}\u{113b8}-\u{113c0}\u{113c2}\u{113c5}\u{113c7}-\u{113ca}\u{113cc}-\u{113d0}\u{113d2}\u{113e1}-\u{113e2}\u{11435}-\u{11446}\u{1145e}\u{114b0}-\u{114c3}\u{115af}-\u{115b5}\u{115b8}-\u{115c0}\u{115dc}-\u{115dd}\u{11630}-\u{11640}\u{116ab}-\u{116b7}\u{1171d}-\u{1172b}\u{1182c}-\u{1183a}\u{11930}-\u{11935}\u{11937}-\u{11938}\u{1193b}-\u{1193e}\u{11940}\u{11942}-\u{11943}\u{119d1}-\u{119d7}\u{119da}-\u{119e0}\u{119e4}\u{11a01}-\u{11a0a}\u{11a33}-\u{11a39}\u{11a3b}-\u{11a3e}\u{11a47}\u{11a51}-\u{11a5b}\u{11a8a}-\u{11a99}\u{11b60}-\u{11b67}\u{11c2f}-\u{11c36}\u{11c38}-\u{11c3f}\u{11c92}-\u{11ca7}\u{11ca9}-\u{11cb6}\u{11d31}-\u{11d36}\u{11d3a}\u{11d3c}-\u{11d3d}\u{11d3f}-\u{11d45}\u{11d47}\u{11d8a}-\u{11d8e}\u{11d90}-\u{11d91}\u{11d93}-\u{11d97}\u{11ef3}-\u{11ef6}\u{11f00}-\u{11f01}\u{11f03}\u{11f34}-\u{11f3a}\u{11f3e}-\u{11f42}\u{11f5a}\u{13440}\u{13447}-\u{13455}\u{1611e}-\u{1612f}\u{16af0}-\u{16af4}\u{16b30}-\u{16b36}\u{16f4f}\u{16f51}-\u{16f87}\u{16f8f}-\u{16f92}\u{16fe4}\u{16ff0}-\u{16ff1}\u{1bc9d}-\u{1bc9e}\u{1cf00}-\u{1cf2d}\u{1cf30}-\u{1cf46}\u{1d165}-\u{1d169}\u{1d16d}-\u{1d172}\u{1d17b}-\u{1d182}\u{1d185}-\u{1d18b}\u{1d1aa}-\u{1d1ad}\u{1d242}-\u{1d244}\u{1da00}-\u{1da36}\u{1da3b}-\u{1da6c}\u{1da75}\u{1da84}\u{1da9b}-\u{1da9f}\u{1daa1}-\u{1daaf}\u{1e000}-\u{1e006}\u{1e008}-\u{1e018}\u{1e01b}-\u{1e021}\u{1e023}-\u{1e024}\u{1e026}-\u{1e02a}\u{1e08f}\u{1e130}-\u{1e136}\u{1e2ae}\u{1e2ec}-\u{1e2ef}\u{1e4ec}-\u{1e4ef}\u{1e5ee}-\u{1e5ef}\u{1e6e3}\u{1e6e6}\u{1e6ee}-\u{1e6ef}\u{1e6f5}\u{1e8d0}-\u{1e8d6}\u{1e944}-\u{1e94a}\u{e0100}-\u{e01ef}]/u
var inputSeparator = /[\s\u0021-\u0023\u0025-\u002a\u002c-\u002f\u003a-\u003b\u003f-\u0040\u005b-\u005d\u005f\u007b\u007d\u00a1\u00a7\u00ab\u00b6-\u00b7\u00bb\u00bf\u037e\u0387\u055a-\u055f\u0589-\u058a\u05be\u05c0\u05c3\u05c6\u05f3-\u05f4\u0609-\u060a\u060c-\u060d\u061b\u061d-\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964-\u0965\u0970\u09fd\u0a76\u0af0\u0c77\u0c84\u0df4\u0e4f\u0e5a-\u0e5b\u0f04-\u0f12\u0f14\u0f3a-\u0f3d\u0f85\u0fd0-\u0fd4\u0fd9-\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u1400\u166e\u169b-\u169c\u16eb-\u16ed\u1735-\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u180a\u1944-\u1945\u1a1e-\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b4e-\u1b4f\u1b5a-\u1b60\u1b7d-\u1b7f\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e-\u1c7f\u1cc0-\u1cc7\u1cd3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205e\u207d-\u207e\u208d-\u208e\u2308-\u230b\u2329-\u232a\u2768-\u2775\u27c5-\u27c6\u27e6-\u27ef\u2983-\u2998\u29d8-\u29db\u29fc-\u29fd\u2cf9-\u2cfc\u2cfe-\u2cff\u2d70\u2e00-\u2e2e\u2e30-\u2e4f\u2e52-\u2e5d\u3001-\u3003\u3008-\u3011\u3014-\u301f\u3030\u303d\u30a0\u30fb\ua4fe-\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce-\ua8cf\ua8f8-\ua8fa\ua8fc\ua92e-\ua92f\ua95f\ua9c1-\ua9cd\ua9de-\ua9df\uaa5c-\uaa5f\uaade-\uaadf\uaaf0-\uaaf1\uabeb\ufd3e-\ufd3f\ufe10-\ufe19\ufe30-\ufe52\ufe54-\ufe61\ufe63\ufe68\ufe6a-\ufe6b\uff01-\uff03\uff05-\uff0a\uff0c-\uff0f\uff1a-\uff1b\uff1f-\uff20\uff3b-\uff3d\uff3f\uff5b\uff5d\uff5f-\uff65\u{10100}-\u{10102}\u{1039f}\u{103d0}\u{1056f}\u{10857}\u{1091f}\u{1093f}\u{10a50}-\u{10a58}\u{10a7f}\u{10af0}-\u{10af6}\u{10b39}-\u{10b3f}\u{10b99}-\u{10b9c}\u{10d6e}\u{10ead}\u{10ed0}\u{10f55}-\u{10f59}\u{10f86}-\u{10f89}\u{11047}-\u{1104d}\u{110bb}-\u{110bc}\u{110be}-\u{110c1}\u{11140}-\u{11143}\u{11174}-\u{11175}\u{111c5}-\u{111c8}\u{111cd}\u{111db}\u{111dd}-\u{111df}\u{11238}-\u{1123d}\u{112a9}\u{113d4}-\u{113d5}\u{113d7}-\u{113d8}\u{1144b}-\u{1144f}\u{1145a}-\u{1145b}\u{1145d}\u{114c6}\u{115c1}-\u{115d7}\u{11641}-\u{11643}\u{11660}-\u{1166c}\u{116b9}\u{1173c}-\u{1173e}\u{1183b}\u{11944}-\u{11946}\u{119e2}\u{11a3f}-\u{11a46}\u{11a9a}-\u{11a9c}\u{11a9e}-\u{11aa2}\u{11b00}-\u{11b09}\u{11be1}\u{11c41}-\u{11c45}\u{11c70}-\u{11c71}\u{11ef7}-\u{11ef8}\u{11f43}-\u{11f4f}\u{11fff}\u{12470}-\u{12474}\u{12ff1}-\u{12ff2}\u{16a6e}-\u{16a6f}\u{16af5}\u{16b37}-\u{16b3b}\u{16b44}\u{16d6d}-\u{16d6f}\u{16e97}-\u{16e9a}\u{16fe2}\u{1bc9f}\u{1da87}-\u{1da8b}\u{1e5ff}\u{1e95e}-\u{1e95f}]/u
var inputWords = new RegExp(inputWordCharacter.source + "+", "gu")
var inputClocks = new RegExp("[0-9]+(?::[0-9]+)+(?: *[ap]m" + inputWordCharacter.source
  + "*)?|[0-9]+ *[ap]m" + inputWordCharacter.source + "*", "giu")

function isLetterOrNumber(character) {
  return character !== "_" && inputWordCharacter.test(character) && !inputMarkCharacter.test(character)
}

function validProject(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]*$/.test(value)
}

function validState(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9_-]*$/.test(value)
}

function validTag(value) {
  return typeof value === "string" && value.length > 0 && value.charAt(0) !== "#"
    && !/[\s\u0000-\u001f\u007f-\u009f,\[\]{}]/.test(value)
}

function wordsIn(text) {
  var words = []
  inputWords.lastIndex = 0
  var match
  while ((match = inputWords.exec(text)) !== null)
    words.push({ value: match[0].toLowerCase(), start: match.index, end: inputWords.lastIndex })
  return words
}

function overlaps(range, protectedRanges) {
  return protectedRanges.some(function(other) { return range.start < other.end && other.start < range.end })
}

function identifierBoundary(text, range) {
  var before = text.charAt(range.start - 1)
  var after = text.charAt(range.end)
  return /[-+.:\\]/.test(before) || /[-+_\\]/.test(after)
    || (/[.:]/.test(after) && isLetterOrNumber(text.charAt(range.end + 1)))
}

function separated(text, first, second) {
  return first.end < second.start && /^\s+$/.test(text.slice(first.end, second.start))
}

function positiveInteger(value) {
  if (!/^[0-9]+$/.test(value)) return 0
  var digits = value.replace(/^0+/, "")
  if (digits.length > 19 || (digits.length === 19 && digits > "9223372036854775807")) return 0
  return Number(value)
}

function weekdayNumber(value) {
  var days = [
    ["sunday", "sun"], ["monday", "mon"], ["tuesday", "tue", "tues"],
    ["wednesday", "wed"], ["thursday", "thu", "thur", "thurs"],
    ["friday", "fri"], ["saturday", "sat"]
  ]
  for (var index = 0; index < days.length; index++)
    if (days[index].indexOf(value) >= 0) return index
  return -1
}

function checkedDate(date) {
  if (isNaN(date.getTime()) || date.getFullYear() < 1 || date.getFullYear() > 9999)
    throw new Error("The detected due date is outside the supported calendar range")
  return keyForDate(date)
}

function clockTime(value) {
  var match = /^(?:([0-9]{2}):([0-9]{2})|([0-9]{1,2})(?::([0-9]{2}))? *(am|pm))$/i.exec(value)
  if (!match) return ""
  var hour = Number(match[1] === undefined ? match[3] : match[1])
  var minute = Number(match[1] === undefined ? (match[4] || 0) : match[2])
  if (match[1] === undefined) {
    if (hour < 1 || hour > 12) return ""
    hour = hour % 12 + (match[5].toLowerCase() === "pm" ? 12 : 0)
  }
  return hour < 24 && minute < 60 ? pad2(hour) + ":" + pad2(minute) : ""
}

function validIpv6(host) {
  var parts = host.split("::")
  if (parts.length > 2) return false
  var groups = (parts[0] ? parts[0].split(":") : []).concat(parts.length === 2 && parts[1] ? parts[1].split(":") : [])
  var count = 0
  for (var index = 0; index < groups.length; index++) {
    var group = groups[index]
    if (/^[0-9a-f]{1,4}$/i.test(group)) count++
    else if (index === groups.length - 1 && group.indexOf(".") >= 0 && host.slice(-group.length) === group) {
      var bytes = group.split(".")
      if (bytes.length !== 4 || bytes.some(function(byte) {
        return !/^(0|[1-9][0-9]{0,2})$/.test(byte) || Number(byte) > 255
      })) return false
      count += 2
    } else return false
  }
  return parts.length === 2 ? count < 8 : count === 8
}

function validUrl(value) {
  if (typeof value !== "string" || /[\s\u0000-\u001f\u007f-\u009f\\<>"{}|^`]/.test(value)
      || /%(?![0-9a-f]{2})/i.test(value)) return false
  var match = /^https?:\/\/([^/?#]*)/i.exec(value)
  if (!match) return false
  var hostPort = match[1]
  var at = hostPort.lastIndexOf("@")
  if (at >= 0) {
    if (/[@\[\]]/.test(hostPort.slice(0, at))) return false
    hostPort = hostPort.slice(at + 1)
  }
  var port
  if (hostPort.charAt(0) === "[") {
    var end = hostPort.indexOf("]")
    if (end < 0 || !validIpv6(hostPort.slice(1, end))) return false
    var suffix = hostPort.slice(end + 1)
    if (suffix && suffix.charAt(0) !== ":") return false
    if (suffix) port = suffix.slice(1)
  } else {
    var colon = hostPort.indexOf(":")
    var host = colon < 0 ? hostPort : hostPort.slice(0, colon)
    if (!host || /[^a-z0-9\-._~%!$&'()*+,;=\u0080-\uffff]/i.test(host)) return false
    if (colon >= 0) port = hostPort.slice(colon + 1)
    if (host.indexOf("%") >= 0) {
      try { host = decodeURIComponent(host) } catch (error) { return false }
      if (/[\s\u0000-\u001f\u007f-\u009f/\\?#@:\[\]<>"{}|^`]/.test(host)) return false
    }
  }
  return port === undefined || (/^[0-9]+$/.test(port) && Number(port) <= 65535)
}

function firstUrl(token) {
  var urls = /https?:\/\/[^\s<>"`]+/gi
  var match
  while ((match = urls.exec(token)) !== null) {
    if (match.index > 0 && "([{<\"'".indexOf(token.charAt(match.index - 1)) < 0) continue
    var value = match[0]
    var balance = [0, 0, 0]
    for (var index = 0; index < value.length; index++) {
      var opening = "([{".indexOf(value.charAt(index))
      var closing = ")]}".indexOf(value.charAt(index))
      if (opening >= 0) balance[opening]++
      if (closing >= 0) balance[closing]--
    }
    while (value.length) {
      var last = value.charAt(value.length - 1)
      var closing = ")]}".indexOf(last)
      if (!(closing >= 0 && balance[closing] < 0) && ".,;:!?'".indexOf(last) < 0) break
      if (closing >= 0) balance[closing]++
      value = value.slice(0, -1)
    }
    if (validUrl(value)) return value
  }
  return ""
}

function expandPhrase(text, range, protectedRanges) {
  var start = range.start
  var end = range.end
  function separator(character) {
    return "/\\#@_".indexOf(character) < 0 && inputSeparator.test(character)
  }
  while (start > 0 && separator(text.charAt(start - 1))
         && !overlaps({ start: start - 1, end: start }, protectedRanges)) start--
  while (end < text.length && separator(text.charAt(end))
         && !overlaps({ start: end, end: end + 1 }, protectedRanges)) end++
  return { start: start, end: end }
}

function removeRanges(text, ranges) {
  ranges.sort(function(left, right) { return left.start - right.start })
  var pieces = []
  var cursor = 0
  ranges.forEach(function(range) {
    if (range.start > cursor) pieces.push(text.slice(cursor, range.start))
    cursor = Math.max(cursor, range.end)
  })
  pieces.push(text.slice(cursor))
  return pieces.join(" ").trim().replace(/\s+/g, " ")
}

function parseInput(text, referenceDate, defaultDueDate) {
  if (typeof text !== "string") throw new Error("Input must be text")
  if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(text))
    throw new Error("Input must be a single line without control characters")
  var bytes = 0
  for (var offset = 0; offset < text.length; offset++) {
    var code = text.charCodeAt(offset)
    if (code >= 0xd800 && code <= 0xdbff) {
      var low = text.charCodeAt(++offset)
      if (!(low >= 0xdc00 && low <= 0xdfff)) throw new Error("Input contains invalid Unicode")
      bytes += 4
    } else {
      if (code >= 0xdc00 && code <= 0xdfff) throw new Error("Input contains invalid Unicode")
      bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : 3
    }
    if (bytes > 16 * 1024) throw new Error("Input must be 16 KiB or smaller")
  }
  var line = text.trim()
  if (!line) throw new Error("Enter a task name or command")
  var first = line.split(/\s+/, 1)[0]
  if (first.charAt(0) === "/") {
    var kind = first.slice(1)
    if (["list", "sync", "help", "clear", "quit", "parent", "attach"].indexOf(kind) < 0)
      throw new Error("Unknown input command: " + first)
    if (kind !== "list" && kind !== "sync" && line !== first)
      throw new Error(first + " does not accept arguments")
    // Store-aware command validation belongs to the CLI, never a second parser.
    return { kind: kind, line: line }
  }
  var reference = referenceDate instanceof Date ? referenceDate : new Date()
  checkedDate(reference)
  var parsed = { kind: "task", name: "", projects: [], tags: [], state: "", url: "", dueDate: "", dueTime: "" }
  var removals = []
  var protectedRanges = []
  var tokens = /\S+/g
  var match
  while ((match = tokens.exec(text)) !== null) {
    var value = match[0]
    var range = { start: match.index, end: tokens.lastIndex }
    var prefix = value.charAt(0)
    var metadata = prefix === "#" || prefix === "@" || prefix === "!"
    if (metadata) {
      var item = value.slice(1)
      if (prefix === "#" && !validProject(item)) throw new Error("Invalid project: " + item)
      if (prefix === "@" && !validTag(item)) throw new Error("Invalid tag: " + item)
      if (prefix === "!") {
        if (!validState(item)) throw new Error("Invalid state: " + item)
        if (parsed.state && parsed.state !== item) throw new Error("Use only one distinct task state")
        parsed.state = item
      } else {
        var values = prefix === "#" ? parsed.projects : parsed.tags
        if (values.indexOf(item) < 0) values.push(item)
      }
      removals.push(range)
    }
    if (metadata || /[/\\@=#]/.test(value)) protectedRanges.push(range)
    if (!metadata && !parsed.url) parsed.url = firstUrl(value)
  }
  var words = wordsIn(text)
  var dateCandidate = null
  var timeCandidate = null
  for (var index = 0; index < words.length; index++) {
    var word = words[index]
    if (overlaps(word, protectedRanges) || identifierBoundary(text, word)) continue
    var candidate = { start: word.start, end: word.end, kind: "", amount: 0 }
    var weekday = weekdayNumber(word.value)
    if (word.value === "today" || word.value === "tod") candidate.kind = "days"
    else if (word.value === "tomorrow" || word.value === "tom") {
      candidate.kind = "days"
      candidate.amount = 1
    } else if (weekday >= 0) {
      candidate.kind = "weekday"
      candidate.amount = weekday
    } else if (word.value === "next" && index + 1 < words.length) {
      var next = words[index + 1]
      if (separated(text, word, next) && !overlaps(next, protectedRanges) && !identifierBoundary(text, next)
          && (next.value === "week" || next.value === "month")) {
        candidate.kind = next.value + "s"
        candidate.amount = 1
        candidate.end = next.end
      }
    } else if (word.value === "in" && index + 2 < words.length) {
      var amountWord = words[index + 1]
      var unit = words[index + 2]
      var amount = positiveInteger(amountWord.value)
      if (amount && separated(text, word, amountWord) && separated(text, amountWord, unit)
          && !overlaps({ start: amountWord.start, end: unit.end }, protectedRanges)
          && !identifierBoundary(text, unit)) {
        var unitName = unit.value.replace(/s$/, "")
        if (["day", "week", "month", "hour", "minute"].indexOf(unitName) >= 0) {
          candidate.end = unit.end
          candidate.kind = unitName + "s"
          candidate.amount = amount
          if (unitName === "hour" || unitName === "minute") {
            var resolved = new Date(reference.getTime() + amount * (unitName === "hour" ? 3600000 : 60000))
            if (resolved.getSeconds() || resolved.getMilliseconds()) resolved = new Date(resolved.getTime() + 60000)
            candidate.kind = "resolved"
            candidate.date = checkedDate(resolved)
            timeCandidate = { start: candidate.start, end: candidate.end, time: pad2(resolved.getHours()) + ":" + pad2(resolved.getMinutes()) }
          }
        }
      }
    }
    if (candidate.kind) dateCandidate = candidate
  }
  inputClocks.lastIndex = 0
  while ((match = inputClocks.exec(text)) !== null) {
    var range = { start: match.index, end: inputClocks.lastIndex }
    var before = text.charAt(range.start - 1)
    var after = text.charAt(range.end)
    if (overlaps(range, protectedRanges) || inputWordCharacter.test(before) || inputWordCharacter.test(after)
        || /[:/\\\-+@#.]/.test(before) || /[:/\\\-+@#]/.test(after)
        || (after === "." && isLetterOrNumber(text.charAt(range.end + 1)))) continue
    var time = clockTime(match[0])
    if (!time) continue
    for (var index = words.length - 1; index >= 0; index--) {
      var previous = words[index]
      if (previous.end > range.start) continue
      if (previous.value === "at" && separated(text, previous, range)
          && !overlaps(previous, protectedRanges) && !identifierBoundary(text, previous))
        range.start = previous.start
      break
    }
    if (!timeCandidate || range.start > timeCandidate.start)
      timeCandidate = { start: range.start, end: range.end, time: time }
  }
  if (dateCandidate) {
    var date = dateCandidate
    var today = dateAtNoon(reference.getFullYear(), reference.getMonth(), reference.getDate())
    if (date.kind === "resolved") parsed.dueDate = date.date
    else {
      var resolved
      if (date.kind === "months") resolved = addMonths(today, date.amount)
      else if (date.kind === "weekday") {
        var distance = (date.amount - today.getDay() + 7) % 7
        resolved = addDays(today, distance || 7)
      } else resolved = addDays(today, date.amount * (date.kind === "weeks" ? 7 : 1))
      parsed.dueDate = checkedDate(resolved)
    }
    removals.push(expandPhrase(text, date, protectedRanges))
  } else if (timeCandidate) parsed.dueDate = checkedDate(reference)
  else if (defaultDueDate !== undefined && defaultDueDate !== "") {
    var fallback = parseDateKey(defaultDueDate)
    if (typeof defaultDueDate !== "string" || !fallback) throw new Error("Invalid default due date")
    parsed.dueDate = checkedDate(fallback)
  }
  if (timeCandidate) {
    parsed.dueTime = timeCandidate.time
    removals.push(expandPhrase(text, timeCandidate, protectedRanges))
  }
  parsed.name = removeRanges(text, removals)
  if (!parsed.name) throw new Error("Enter a task name in addition to its metadata")
  return parsed
}

function completeInput(text, cursor, catalog) {
  if (typeof text !== "string" || typeof cursor !== "number" || !isFinite(cursor)
      || Math.floor(cursor) !== cursor || cursor < 0 || cursor > text.length) return []
  var start = cursor
  var end = cursor
  while (start > 0 && !/\s/.test(text.charAt(start - 1))) start--
  while (end < text.length && !/\s/.test(text.charAt(end))) end++
  var prefix = text.slice(start, cursor).toLowerCase()
  var before = text.slice(0, start).trim()
  var first = text.trim().split(/\s+/, 1)[0]
  var values = []
  catalog = catalog || { projects: [], tags: [], states: [] }
  if (before === "/sync") values = ["ours", "theirs"]
  else if (prefix.charAt(0) === "/" && !before)
    values = ["/list", "/sync", "/help", "/clear", "/quit", "/parent", "/attach"]
  else if (prefix.charAt(0) === "#")
    values = catalog.projects.map(function(project) { return "#" + project.slug }).sort()
  else if (prefix.charAt(0) === "@")
    values = catalog.tags.map(function(tag) { return "@" + tag }).sort()
  else if (prefix.charAt(0) === "!")
    values = catalog.states.map(function(state) { return "!" + state.id })
  else if (prefix.charAt(0) === "d" && first === "/list")
    values = ["due:today", "due:tomorrow", "due:overdue", "due:none"]
  return values.filter(function(value) { return value.toLowerCase().indexOf(prefix) === 0 })
    .map(function(value) { return { value: value, label: value, start: start, end: end } })
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function parseObject(text, label) {
  if (typeof text !== "string") throw new Error(label + " must be JSON text")
  var value
  try {
    value = JSON.parse(text)
  } catch (error) {
    throw new Error(label + " is not valid JSON")
  }
  if (!isPlainObject(value)) throw new Error(label + " must be a JSON object")
  return value
}

function normalizeParentId(value) {
  if (typeof value !== "string" || value.length !== 26 || !/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(value))
    throw new Error("Parent must be a full ULID")
  return value.toUpperCase()
}

function parseLaunchPayload(json) {
  var payload = parseObject(json === undefined || json === "" ? "{}" : json, "Launch payload")
  var text = hasOwn(payload, "text") ? payload.text : ""
  var dueDate = hasOwn(payload, "dueDate") ? payload.dueDate : ""
  if (typeof text !== "string") throw new Error("Launch text must be a string")
  if (typeof dueDate !== "string") throw new Error("Launch dueDate must be a string")
  return {
    text: text,
    dueDate: dueDate,
    parentId: hasOwn(payload, "parentId") ? normalizeParentId(payload.parentId) : ""
  }
}

function decodeEnvelope(text, label) {
  var value = parseObject(text, label)
  if (value.version !== 1 || hasOwn(value, "error"))
    throw new Error(label + " has an unsupported or unsuccessful envelope")
  return value
}

function decodeCapabilities(text) {
  var value = decodeEnvelope(text, "Capabilities response")
  if (!Array.isArray(value.store_schema_versions) || !Array.isArray(value.features))
    throw new Error("Capabilities response must include schema versions and features")
  var versions = value.store_schema_versions
  for (var index = 0; index < versions.length; index++) {
    var version = versions[index]
    if (typeof version !== "number" || !isFinite(version) || version < 1
        || Math.floor(version) !== version || versions.indexOf(version) !== index)
      throw new Error("Capabilities response contains an invalid schema version")
  }
  for (var index = 0; index < value.features.length; index++) {
    var feature = value.features[index]
    if (typeof feature !== "string" || feature.length === 0
        || value.features.indexOf(feature) !== index)
      throw new Error("Capabilities response contains an invalid feature")
  }
  return value
}

function attachmentFilePath(url) {
  var value = String(url || "")
  // A local drop must identify the actual file, without remote hosts or URL fragments.
  var match = /^file:\/\/(?:localhost)?(\/[^?#]*)$/i.exec(value)
  if (!match) throw new Error("Choose or drop local files only.")
  var path
  try { path = decodeURIComponent(match[1]) }
  catch (error) { throw new Error("The dropped file URL is invalid.") }
  if (!path || path.indexOf("\u0000") >= 0 || path.charAt(path.length - 1) === "/")
    throw new Error("Choose a file, not a folder.")
  return path
}

function localFileUrl(path) {
  var value = String(path || "")
  if (value.charAt(0) !== "/" || value.indexOf("\u0000") >= 0)
    throw new Error("Use an absolute local folder path.")
  return "file://" + value.split("/").map(function(part) { return encodeURIComponent(part) }).join("/")
}

function attachmentSelection(url, size) {
  var path = attachmentFilePath(url)
  if (size !== undefined && (typeof size !== "number" || !isFinite(size) || size < 0
      || Math.floor(size) !== size)) throw new Error("The file size is invalid.")
  if (size > 20 * 1024 * 1024) throw new Error("Attachments must be 20 MiB or smaller.")
  return { path: path, name: path.slice(path.lastIndexOf("/") + 1), size: size === undefined ? null : size }
}

function attachmentSizeLabel(size) {
  if (size === null) return "Size checked when adding"
  if (size < 1024) return size + " B"
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KiB"
  return (size / (1024 * 1024)).toFixed(1) + " MiB"
}

function validateTask(task, compact) {
  if (!isPlainObject(task)) throw new Error("Task response must contain a task object")
  if (typeof task.id !== "string" || normalizeParentId(task.id) !== task.id)
    throw new Error("Task response contains a noncanonical task ID")
  for (var index = 0; index < 3; index++) {
    var key = ["path", "name", "state"][index]
    if (typeof task[key] !== "string" || task[key].trim().length === 0)
      throw new Error("Task response contains an invalid " + key)
  }
  if (typeof task.terminal !== "boolean")
    throw new Error("Task response contains an invalid terminal flag")
  if (!hasOwn(task, "parent")) {
    // Older flat CLIs remain usable for root quick-add, without a capability probe.
    if (compact) throw new Error("Candidate response is missing parent")
    task.parent = null
  } else if (task.parent !== null
      && (typeof task.parent !== "string" || normalizeParentId(task.parent) !== task.parent)) {
    throw new Error("Task response contains a noncanonical parent ID")
  }
  if (compact) {
    var keys = Object.keys(task)
    var allowed = ["id", "path", "name", "state", "terminal", "parent"]
    if (keys.length !== allowed.length || keys.some(function(key) { return allowed.indexOf(key) < 0 }))
      throw new Error("Candidate response must contain compact tasks only")
  }
  return task
}

function decodeTask(text) {
  try {
    return validateTask(decodeEnvelope(text, "Task response").task, false)
  } catch (error) {
    // A zero-exit mutation may have committed despite missing or malformed output.
    // QML must preserve the draft but block retry until the user checks the store.
    error.safeToRetry = false
    throw error
  }
}

function decodeCandidates(text) {
  var value = decodeEnvelope(text, "Candidate response")
  if (!Array.isArray(value.tasks) || value.tasks.length > 25 || typeof value.has_more !== "boolean"
      || (value.has_more && value.tasks.length !== 25))
    throw new Error("Candidate response must contain at most 25 tasks and a valid truncation flag")
  var ids = []
  for (var index = 0; index < value.tasks.length; index++) {
    var task = validateTask(value.tasks[index], true)
    if (ids.indexOf(task.id) >= 0) throw new Error("Candidate response contains duplicate task IDs")
    ids.push(task.id)
  }
  return { tasks: value.tasks, has_more: value.has_more }
}

function validStringArray(values, validator) {
  return Array.isArray(values) && values.every(function(value, index) {
    return validator(value) && values.indexOf(value) === index
  })
}

function decodeCatalog(text) {
  var value = decodeEnvelope(text, "Catalog response")
  if (Object.keys(value).length !== 2 || !hasOwn(value, "catalog"))
    throw new Error("Catalog response contains an unexpected result")
  var catalog = value.catalog
  if (!isPlainObject(catalog) || !Array.isArray(catalog.projects) || !Array.isArray(catalog.states)
      || !validStringArray(catalog.tags, validTag) || !validState(catalog.default_state))
    throw new Error("Catalog response contains an invalid catalog")
  var projects = []
  catalog.projects.forEach(function(project) {
    if (!isPlainObject(project) || !validProject(project.slug)
        || typeof project.name !== "string" || !project.name.trim()
        || projects.indexOf(project.slug) >= 0)
      throw new Error("Catalog response contains an invalid or duplicate project")
    projects.push(project.slug)
  })
  var states = []
  var defaultFound = false
  catalog.states.forEach(function(state) {
    if (!isPlainObject(state) || !validState(state.id) || typeof state.name !== "string"
        || !state.name.trim() || typeof state.terminal !== "boolean" || states.indexOf(state.id) >= 0)
      throw new Error("Catalog response contains an invalid or duplicate state")
    states.push(state.id)
    if (state.id === catalog.default_state && !state.terminal) defaultFound = true
  })
  if (!defaultFound) throw new Error("Catalog response has no nonterminal default state")
  return catalog
}

function validateTaskView(task) {
  if (!isPlainObject(task) || !hasOwn(task, "parent"))
    throw new Error("List response must contain full task views")
  validateTask(task, false)
  if (!validState(task.state) || !validStringArray(task.projects, validProject)
      || !validStringArray(task.tags, validTag) || typeof task.body !== "string"
      || !isPlainObject(task.extra_properties))
    throw new Error("List response contains invalid task properties")
  if (task.url !== null && !validUrl(task.url))
    throw new Error("List response contains an invalid task URL")
  for (var index = 0; index < 2; index++) {
    var key = ["due_date", "last_completed_date"][index]
    if (task[key] !== null && (typeof task[key] !== "string" || !parseDateKey(task[key])
        || task[key].slice(0, 4) === "0000"))
      throw new Error("List response contains an invalid " + key)
  }
  if (task.due_time !== null && (typeof task.due_time !== "string"
      || !/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(task.due_time) || task.due_date === null))
    throw new Error("List response contains an invalid due_time")
  if (task.recurrence !== null && (typeof task.recurrence !== "string" || !task.recurrence.trim()))
    throw new Error("List response contains an invalid recurrence")
  if (task.recurrence_from !== null && ["schedule", "completion"].indexOf(task.recurrence_from) < 0)
    throw new Error("List response contains an invalid recurrence mode")
  if ((task.recurrence === null) !== (task.recurrence_from === null)
      || (task.recurrence !== null && task.due_date === null)
      || (task.last_completed_date !== null && task.recurrence === null))
    throw new Error("List response contains inconsistent recurrence properties")
  return task
}

function decodeInputResult(text, kind) {
  try {
    if (kind !== "list" && kind !== "sync") throw new Error("Unknown input result kind")
    var value = decodeEnvelope(text, "Input response")
    var field = kind === "list" ? "tasks" : "sync"
    if (Object.keys(value).length !== 2 || !hasOwn(value, field))
      throw new Error("Input response contains an unexpected result")
    if (kind === "list") {
      if (!Array.isArray(value.tasks)) throw new Error("List response must contain tasks")
      var ids = []
      value.tasks.forEach(function(task) {
        validateTaskView(task)
        if (ids.indexOf(task.id) >= 0) throw new Error("List response contains duplicate task IDs")
        ids.push(task.id)
      })
    } else {
      var sync = value.sync
      if (!isPlainObject(sync) || typeof sync.branch !== "string" || !sync.branch.trim()
          || typeof sync.upstream !== "string" || !sync.upstream.trim()
          || typeof sync.committed !== "boolean" || typeof sync.conflicts_resolved !== "number"
          || !isFinite(sync.conflicts_resolved) || sync.conflicts_resolved < 0
          || Math.floor(sync.conflicts_resolved) !== sync.conflicts_resolved)
        throw new Error("Sync response contains an invalid summary")
    }
    return value
  } catch (error) {
    // A sync may have committed or pushed even when its result cannot be decoded.
    error.safeToRetry = kind === "list"
    throw error
  }
}

// Only add-path rejections known to precede publication permit another attempt.
// In particular, validation-kind serialization errors are not blanket-safe:
// response serialization, directory sync, and lock release happen after add.
function isPrewriteMutationError(code, exitCode) {
  switch (exitCode) {
  case 2:
    return ["usage_error", "invalid_root"].indexOf(code) >= 0
  case 3:
    return ["task_not_found", "store_not_found", "project_not_found"].indexOf(code) >= 0
  case 4:
    return code === "ambiguous_store"
  case 5:
    return [
      "invalid_parent_id", "missing_parent_reference", "self_parent_reference", "parent_cycle",
      "attachment_source_invalid", "attachment_too_large", "unsafe_attachment_path", "attachments_disabled",
      "duplicate_task_id", "invalid_task_id", "invalid_task_path", "invalid_name", "unknown_state",
      "invalid_date", "invalid_tag", "duplicate_tag", "invalid_project_slug", "duplicate_project",
      "invalid_due_time", "due_time_requires_due_date", "invalid_url",
      "invalid_recurrence", "invalid_recurrence_mode", "recurrence_requires_due_date",
      "due_date_not_occurrence", "recurrence_requires_mode", "mode_requires_recurrence",
      "completion_date_requires_recurrence", "invalid_config", "invalid_config_utf8",
      "invalid_store_root", "invalid_store_file", "invalid_schema_file", "invalid_managed_path",
      "managed_paths_not_distinct", "managed_directory_missing", "managed_path_symlink",
      "managed_path_not_directory", "invalid_link_prefix", "invalid_state_id", "duplicate_state_id",
      "invalid_state_name", "missing_nonterminal_state", "invalid_default_state", "terminal_default_state",
      "record_too_large", "file_too_large", "invalid_utf8", "utf8_bom_not_allowed", "record_symlink",
      "invalid_record_file", "invalid_path", "path_escape", "nested_project", "invalid_project_path",
      "missing_frontmatter", "missing_frontmatter_delimiter", "duplicate_yaml_key", "invalid_yaml_syntax",
      "invalid_frontmatter_type", "unsafe_yaml_construct", "yaml_too_deep", "yaml_too_complex",
      "invalid_yaml_number", "unsupported_yaml_key", "missing_property", "invalid_property_type",
      "invalid_project_link", "redundant_id_property", "reserved_extra_property"
    ].indexOf(code) >= 0
  case 6:
    return ["concurrent_modification", "unresolved_conflict", "task_id_collision"].indexOf(code) >= 0
  case 7:
    return ["unsupported_schema", "schema_version_mismatch", "unsupported_recurrence"].indexOf(code) >= 0
  default:
    return false
  }
}

function decodeMutationError(stderr, exitCode) {
  var fallback = typeof stderr === "string" ? stderr.trim() : ""
  var result = { message: fallback || "otodo failed without an error message", safeToRetry: false }
  if (!fallback) return result
  var value
  try {
    value = parseObject(fallback, "Error response")
  } catch (error) {
    return result
  }
  if (value.version !== 1 || !isPlainObject(value.error)
      || typeof value.error.code !== "string" || !value.error.code.trim()
      || typeof value.error.message !== "string" || !value.error.message.trim())
    return result
  var detail = value.error
  var message = detail.message + " (" + detail.code + ")"
  if (typeof detail.path === "string" && detail.path) message += "\n" + detail.path
  if (typeof detail.field === "string" && detail.field) message += "\nField: " + detail.field
  result.message = message
  // A mixed success/error envelope or malformed metadata cannot prove no write.
  if (Object.keys(value).some(function(key) { return key !== "version" && key !== "error" })
      || Object.keys(detail).some(function(key) {
        return ["code", "message", "path", "field", "line", "column", "issues", "validation"].indexOf(key) < 0
      })
      || ["path", "field"].some(function(key) {
        return hasOwn(detail, key) && detail[key] !== null && typeof detail[key] !== "string"
      })
      || ["line", "column"].some(function(key) {
        var number = detail[key]
        return hasOwn(detail, key) && number !== null
          && (typeof number !== "number" || !isFinite(number) || number < 1 || Math.floor(number) !== number)
      })
      || (hasOwn(detail, "issues") && (!Array.isArray(detail.issues) || detail.issues.length !== 0))
      || (hasOwn(detail, "validation") && detail.validation !== null))
    return result
  result.safeToRetry = isPrewriteMutationError(detail.code, exitCode)
  return result
}

function decodeError(stderr) {
  return decodeMutationError(stderr).message
}

if (typeof module !== "undefined") {
  module.exports = {
    attachmentFilePath: attachmentFilePath,
    attachmentSelection: attachmentSelection,
    attachmentSizeLabel: attachmentSizeLabel,
    addDays: addDays,
    addMonths: addMonths,
    dateAtNoon: dateAtNoon,
    completeInput: completeInput,
    decodeCatalog: decodeCatalog,
    decodeInputResult: decodeInputResult,
    decodeCandidates: decodeCandidates,
    decodeCapabilities: decodeCapabilities,
    decodeError: decodeError,
    decodeMutationError: decodeMutationError,
    decodeTask: decodeTask,
    keyForDate: keyForDate,
    keyForParts: keyForParts,
    localFileUrl: localFileUrl,
    normalizeParentId: normalizeParentId,
    parseDateKey: parseDateKey,
    parseInput: parseInput,
    parseLaunchPayload: parseLaunchPayload
  }
}
