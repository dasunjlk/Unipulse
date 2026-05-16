import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-card/30 py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 text-sm font-black text-white">
                U
              </span>
              <span className="text-lg font-bold text-white">UniPulse</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Discover, connect, and experience the best campus events. Your university life,
              amplified.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link href="/" className="text-foreground hover:text-purple-300">
                  Discover Events
                </Link>
              </li>
              <li>
                <Link href="/map" className="text-foreground hover:text-purple-300">
                  Campus Map
                </Link>
              </li>
              <li>
                <Link href="/dashboard/organizer" className="text-foreground hover:text-purple-300">
                  Organizer Dashboard
                </Link>
              </li>
              <li>
                <span className="text-muted-foreground">Community</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Resources
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>Help Center</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Contact Us</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Stay Updated
            </h4>
            <p className="mt-3 text-sm text-muted-foreground">
              Get notified about trending events on campus.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:border-purple-500/50 focus:outline-none"
                readOnly
                aria-label="Newsletter email"
              />
              <button
                type="button"
                className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white"
              >
                Join
              </button>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} UniPulse. All rights reserved.</p>
          <p>Made with passion for campus communities</p>
        </div>
      </div>
    </footer>
  );
}
