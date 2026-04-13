import type { PropsWithChildren, ReactNode } from "react";

interface AppFrameProps extends PropsWithChildren {
  sidebar: ReactNode;
  masthead: ReactNode;
  presenting: boolean;
}

export function AppFrame({ children, sidebar, masthead, presenting }: AppFrameProps) {
  return (
    <div className={`app-frame${presenting ? " app-frame--presenting" : ""}`}>
      {!presenting ? <aside className="app-sidebar">{sidebar}</aside> : null}
      <div className="app-main">
        <header className="app-masthead">{masthead}</header>
        <section className="app-workspace">{children}</section>
      </div>
    </div>
  );
}
