import { useGame } from "./context/GameContext";
import { HomePage } from "./pages/HomePage";
import { RoomPage } from "./pages/RoomPage";

export default function App() {
  const { restoring, room, error, dismissError } = useGame();
  if (restoring) return <main className="loading-screen"><span className="brand-sigil large">M</span><p>사건 기록을 확인하는 중…</p></main>;
  return <>{room ? <RoomPage/> : <HomePage/>}{error && <div className="error-toast" role="alert"><span>{error}</span><button onClick={dismissError}>닫기</button></div>}</>;
}
