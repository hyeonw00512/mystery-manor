import { useGame } from "../context/GameContext";

export function ConnectionBadge() {
  const { connected } = useGame();
  return <span className={`connection ${connected ? "is-online" : "is-offline"}`}><span aria-hidden="true" />{connected ? "서버 연결됨" : "재연결 중"}</span>;
}
