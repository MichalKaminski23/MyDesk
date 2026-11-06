export function SpaceArt({ room = false, variant = 0 }: { room?: boolean; variant?: number }) {
  const wall = ['#eeeadd', '#e4e9de', '#e7e6ee', '#eee5db'][variant % 4];
  const chair = ['#638473', '#b68e6e', '#7f8d9c', '#a49c79'][variant % 4];
  return <svg viewBox="0 0 400 200" fill="none" aria-hidden="true" className="space-art">
    <rect width="400" height="200" fill={wall} />
    <path d="M0 157 234 127 400 151v49H0Z" fill="#fff" fillOpacity=".36" />
    <path d="M278 0v133M354 0v142" stroke="#fff" strokeWidth="5" strokeOpacity=".5" />
    <path d="m281 18 70 10v81l-70-9z" fill="#c9d9ce" />
    <path d="m316 23 1 81m-35-45 70 9" stroke="#f6f5ed" strokeWidth="4" />
    <ellipse cx="200" cy="173" rx="130" ry="15" fill="#434d3f" fillOpacity=".07" />
    {room ? <>
      <path d="m113 115 80-16 100 19-80 22z" fill="#c7ac88" />
      <path d="m113 115 100 19 80-16v8l-80 22-100-24z" fill="#b59773" />
      <path d="m129 128 1 35m144-30v32m-65-19v32" stroke="#787d70" strokeWidth="5" />
      {[0, 1, 2].map(i => <g key={i} transform={`translate(${i * 48},${i * 7})`}>
        <path d="M116 133v-19q0-9 10-8l14 3q5 2 4 9v19" fill={chair} />
        <path d="m115 132 27 5 10-3-26-5z" fill={chair} />
        <path d="m121 137-1 21m24-17 1 19" stroke="#555f53" strokeWidth="3" />
      </g>)}
      <path d="m199 112 19-4 17 4-19 5z" fill="#f8f6ee" />
      <path d="m235 121 18-5 15 3-18 5z" fill="#6c7b70" />
      <rect x="94" y="36" width="72" height="47" rx="2" fill="#f8f7ef" />
      <path d="m105 69 12-9 11 5 24-16" stroke="#91a594" strokeWidth="2" />
    </> : <>
      <path d="m103 116 121-19 75 18-122 23z" fill="#d2b38c" />
      <path d="m103 116 74 17 122-18v8l-122 23-74-22z" fill="#bc9d77" />
      <path d="m116 128-2 43m170-43 2 39m-107-25v39" stroke="#6c7566" strokeWidth="5" />
      <path d="m184 74 51-8v38l-51 9z" fill="#394d43" />
      <path d="m188 78 43-7v28l-43 8z" fill="#9fb5a8" />
      <path d="m207 109 1 9-12 3 24 4 10-3-18-4" fill="#637165" />
      <path d="m215 125 27-5 17 4-28 5z" fill="#f6f3e8" />
      <path d="M141 158v-28q0-12 13-9l22 5q8 2 8 13v27" fill={chair} />
      <path d="m141 158 37 9 17-5-35-9z" fill={chair} />
      <path d="M168 168v18m-15 3 15-4 15 5" stroke="#5c685b" strokeWidth="3" />
      <path d="m264 109 11 2-1 11-9-2z" fill="#f8f6ed" />
      <path d="M275 113q9-1 5 5h-5" stroke="#f8f6ed" strokeWidth="2" />
    </>}
    <path d="m65 134 22 4-4 26-14-3z" fill="#bc9676" />
    <path d="M77 140v-40m0 23q-22-2-17-21 19 3 17 21m0-11q20 0 19-18-18 0-19 18m0-9q-12-8-5-22 14 10 5 22" fill="#6b8b68" />
    <path d="m327 142 20 4-4 23-12-2z" fill="#e5d9c3" />
    <path d="M338 147v-30m0 18q-18-1-16-15 16 2 16 15m0-8q17-1 16-16-16 3-16 16" fill="#779275" />
  </svg>;
}

export function HeroArt() {
  return <svg viewBox="0 0 440 260" fill="none" aria-hidden="true" className="hero-art">
    <circle cx="283" cy="124" r="110" fill="#e3ebcc" />
    <path d="m79 183 164-51 150 54-166 56z" fill="#c5d5ac" />
    <path d="M105 177V69l131-35v104" fill="#f5f5e9" />
    <path d="m236 34 115 42v107l-115-45z" fill="#dbe5ce" />
    <path d="m123 83 78-21v60l-78 21z" fill="#c4d7c2" />
    <path d="m161 73 1 60m-39-20 77-21" stroke="#fffef5" strokeWidth="5" />
    <path d="m160 158 96-27 70 26-98 30z" fill="#f1dfba" />
    <path d="m160 158 68 25 98-26v9l-98 30-68-26z" fill="#d4ba8c" />
    <path d="m172 175-1 37m140-38v37m-84-16v35" stroke="#5c775e" strokeWidth="6" />
    <path d="m230 101 45 16v37l-45-16z" fill="#486a55" />
    <path d="m234 107 37 13v26l-37-13z" fill="#a8c3ad" />
    <path d="m252 148 1 10-9 3 19 6 9-3-15-6" fill="#6c8871" />
    <path d="m260 173 25-8 19 7-26 8z" fill="#faf8ed" />
    <path d="M197 190v-26q0-11 11-7l18 7q8 4 8 13v25" fill="#50745b" />
    <path d="m197 190 34 13 14-5-34-13z" fill="#50745b" />
    <path d="M220 201v22m-13 6 13-7 12 6" stroke="#3f604c" strokeWidth="4" />
    <path d="m127 166 21 7-3 23-15-5z" fill="#e1c093" />
    <path d="M138 173v-42m0 26q-21-2-18-20 19 3 18 20m0-13q20 0 17-19-16 2-17 19m0-8q-12-7-6-21 12 9 6 21" fill="#66865b" />
    <path d="m306 98 23 8v26l-23-8z" fill="#f5f4e7" />
    <path d="m311 117 7-7 6 8" stroke="#95ae81" strokeWidth="2" />
    <rect x="75" y="48" width="91" height="31" rx="15.5" fill="#fffef8" />
    <circle cx="93" cy="64" r="7" fill="#dce9c7" />
    <path d="m90 64 2 2 4-4" stroke="#496b4c" strokeWidth="1.5" />
    <path d="M107 61h43m-43 6h27" stroke="#99aa8d" strokeWidth="3" strokeLinecap="round" />
    <circle cx="353" cy="61" r="19" fill="#f9faf0" />
    <path d="M353 51v10l7 4" stroke="#67825b" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}
