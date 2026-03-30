import { Link } from "react-router-dom";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="h-7 w-7 rounded-full bg-lime flex items-center justify-center">
        <div className="h-2.5 w-2.5 rounded-full bg-coal" />
      </div>
      <span className="text-lg font-semibold text-foreground tracking-tight">maetra</span>
    </Link>
  );
}
