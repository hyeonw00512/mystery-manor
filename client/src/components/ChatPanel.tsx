import { useEffect, useRef, useState, type FormEvent } from "react";
import { useGame } from "../context/GameContext";

export function ChatPanel() {
  const { chat, sendChat } = useGame(); const [message, setMessage] = useState(""); const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [chat]);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!message.trim()) return; if (await sendChat(message)) setMessage(""); };
  return <section className="panel chat-panel"><div className="section-heading compact"><div><span className="eyebrow">보안 채널</span><h2>실시간 대화</h2></div></div><div className="chat-list" ref={listRef}>{chat.length === 0 ? <p className="empty-chat">첫 메시지를 남겨 조사 방향을 정해보세요.</p> : chat.map((item) => <div className="chat-item" key={item.id}><span><strong>{item.nickname}</strong><time>{new Date(item.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</time></span><p>{item.message}</p></div>)}</div><form className="chat-form" onSubmit={submit}><input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={300} placeholder="메시지 입력" aria-label="채팅 메시지" /><button type="submit" aria-label="전송">↑</button></form></section>;
}
