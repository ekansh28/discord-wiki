import WikiEditor from '@/app/components/WikiEditor'

import '@/app/globals.css' // Import your retro MySpace-style CSS

export default function HomePage() {
  return (
    <div className="wrapper">
      <header>
        <img
          src="https://cdn.sekansh21.workers.dev/fire.gif"
          alt="Fire GIF"
          className="fire-gif"
        />
        Ballscord Wiki
      </header>

      <nav>
        <a href="#">Home</a>
        <a href="#">Articles</a>
        <a href="#">Recent Edits</a>
        <a href="#">Login</a>
      </nav>

      <WikiEditor />

      <footer>
        🌀 Made with love & chaos on Neocities | Styled like 2007 | Powered by your trauma
      </footer>
    </div>
  )
}
