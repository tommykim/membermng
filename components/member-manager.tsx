'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { createClient, isLocalMockMode } from '@/lib/supabase/client'
import { ArrowDownToLine, CalendarDays, Check, ChevronLeft, ChevronRight, CircleUserRound, LogOut, Mail, Pencil, Plus, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react'

type Member = { id: string; name: string; email: string; phone: string; birth_date: string; created_at: string }
type FormValues = { name: string; email: string; phone: string; birth_date: string }
const emptyForm: FormValues = { name: '', email: '', phone: '', birth_date: '' }
const pageSize = 8

function dateLabel(value: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}
function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function AuthGate({ onDone }: { onDone: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } })
    setBusy(false)
    if (result.error) { setMessage(mode === 'login' ? '이메일 또는 비밀번호를 확인해 주세요.' : result.error.message.includes('Password') ? '비밀번호는 6자 이상 입력해 주세요.' : '가입을 완료할 수 없습니다. 입력한 정보를 확인해 주세요.'); return }
    if (mode === 'signup' && !result.data.session) setMessage('인증 이메일을 보냈습니다. 이메일 인증을 마친 뒤 로그인해 주세요.')
    else onDone()
  }
  return <main className="auth-shell"><section className="auth-card"><div className="brand-mark"><Users size={22} /></div><p className="eyebrow">MEMBER DESK</p><h1>회원관리 프로그램</h1><p className="auth-copy">안전하게 회원 정보를 관리하세요.</p><form onSubmit={submit} className="auth-form"><label>이메일<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></label><label>비밀번호<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="6자 이상 입력" /></label>{message && <p className="notice" role="status">{message}</p>}<button className="primary-button auth-submit" disabled={busy}>{busy ? '처리 중…' : mode === 'login' ? '로그인' : '계정 만들기'}</button></form><button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? '처음이신가요? 계정 만들기' : '이미 계정이 있으신가요? 로그인'}</button><p className="secure-note"><ShieldCheck size={15} /> {isLocalMockMode() ? '로컬 모드: 별도 DB 설정 없이 바로 가입/로그인하여 사용할 수 있습니다.' : '회원 데이터는 계정별로 안전하게 분리됩니다.'}</p></section></main>
}

export default function MemberManager() {
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive) { setUserId(data.session?.user.id ?? null); setAuthReady(true) } })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null))
    return () => { alive = false; subscription.unsubscribe() }
  }, [supabase])

  const fetchMembers = useCallback(async () => {
    if (!userId) return [] as Member[]
    const { data, error } = await supabase.from('members').select('id,name,email,phone,birth_date,created_at').order('created_at', { ascending: false })
    if (error) throw error
    return data as Member[]
  }, [supabase, userId])
  const { data: members, error: loadError, isLoading, mutate } = useSWR(userId ? ['members', userId] : null, fetchMembers)

  const filtered = useMemo(() => (members ?? []).filter(member => [member.name, member.email, member.phone].some(value => value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))), [members, query])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const thisMonth = (members ?? []).filter(member => { const date = new Date(member.created_at); const now = new Date(); return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() }).length

  async function saveMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null)
    const payload = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), birth_date: form.birth_date }
    const result = editingId
      ? await supabase.from('members').update(payload).eq('id', editingId)
      : await supabase.from('members').insert(payload)
    setBusy(false)
    if (result.error) { setNotice({ text: result.error.message.includes('duplicate') ? '이미 등록된 이메일입니다.' : '저장하지 못했습니다. 입력 내용을 확인해 주세요.', error: true }); return }
    setNotice({ text: editingId ? '회원 정보를 수정했습니다.' : '새 회원을 등록했습니다.' })
    setForm(emptyForm); setEditingId(null); await mutate()
  }
  function beginEdit(member: Member) { setForm({ name: member.name, email: member.email, phone: member.phone, birth_date: member.birth_date }); setEditingId(member.id); setNotice(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  async function removeMember(member: Member) {
    if (!window.confirm(`${member.name} 회원을 삭제할까요? 삭제한 정보는 복구할 수 없습니다.`)) return
    const { error } = await supabase.from('members').delete().eq('id', member.id)
    if (error) { setNotice({ text: '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.', error: true }); return }
    if (editingId === member.id) cancelEdit()
    setNotice({ text: '회원을 삭제했습니다.' }); await mutate()
  }
  function cancelEdit() { setEditingId(null); setForm(emptyForm); setNotice(null) }
  function exportCsv() {
    const rows = [['이름', '이메일', '전화번호', '생년월일', '가입일'], ...(members ?? []).map(m => [m.name, m.email, m.phone, m.birth_date, dateTimeLabel(m.created_at)])]
    const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = '회원목록.csv'; link.click(); URL.revokeObjectURL(link.href)
  }

  if (!authReady) return <main className="loading-screen"><div className="loading-dot" />회원 정보를 불러오는 중입니다.</main>
  if (!userId) return <AuthGate onDone={() => {}} />

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><Users size={19} /></span><span>Member<span className="brand-accent">Desk</span></span></a><div className="top-actions"><span className="account-label"><CircleUserRound size={17} /> 관리자</span><button className="icon-button logout-button" onClick={() => supabase.auth.signOut()} aria-label="로그아웃"><LogOut size={17} /><span>로그아웃</span></button></div></header>
    <div className="content-wrap" id="top"><div className="page-heading"><div><p className="eyebrow">MEMBER MANAGEMENT</p><h1>회원관리 프로그램</h1><p className="page-subtitle">회원 정보를 한곳에서 등록하고 관리하세요.</p></div><span className="today-label"><CalendarDays size={16} />{new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}</span></div>
      <section className="stats-grid" aria-label="회원 통계"><article className="stat-card"><span className="stat-icon"><Users size={19} /></span><span className="stat-label">전체 회원</span><strong>{members?.length ?? 0}<small>명</small></strong><span className="stat-foot">등록된 전체 회원 수</span></article><article className="stat-card"><span className="stat-icon stat-icon-green"><Plus size={19} /></span><span className="stat-label">이번 달 신규</span><strong>{thisMonth}<small>명</small></strong><span className="stat-foot">이번 달 가입 회원</span></article><article className="stat-card"><span className="stat-icon stat-icon-amber"><Check size={19} /></span><span className="stat-label">관리 상태</span><strong className="active-state">{isLocalMockMode() ? '로컬 모드' : '정상 운영'}</strong><span className="stat-foot">{isLocalMockMode() ? '브라우저 로컬 저장소에 저장됩니다' : '데이터가 안전하게 저장됩니다'}</span></article></section>
      <section className="form-card"><div className="section-title-row"><div className="title-with-icon"><span className="section-icon"><Plus size={19} /></span><div><h2>{editingId ? '회원 정보 수정' : '새 사용자 등록'}</h2><p>{editingId ? '수정할 회원 정보를 입력해 주세요.' : '새로운 회원 정보를 입력해 주세요.'}</p></div></div>{editingId && <button className="text-button" onClick={cancelEdit}><X size={16} /> 수정 취소</button>}</div>
        <form onSubmit={saveMember} className="member-form"><label>이름<input required maxLength={100} placeholder="이름을 입력해 주세요" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>이메일<input type="email" required maxLength={254} placeholder="name@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>전화번호<input type="tel" required maxLength={30} placeholder="010-1234-5678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><label>생년월일<input type="date" required value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} /></label><div className="form-footer">{notice && <span className={notice.error ? 'form-notice error-text' : 'form-notice'} role="status">{notice.text}</span>}<button className="primary-button" disabled={busy}>{editingId ? <Check size={17} /> : <Plus size={17} />}{busy ? '저장 중…' : editingId ? '수정 내용 저장' : '회원 등록'}</button></div></form>
      </section>
      <section className="list-section"><div className="list-heading"><div><p className="eyebrow">DIRECTORY</p><h2>회원 목록 <span className="count-badge">{filtered.length}</span></h2><p>등록된 회원 정보를 확인하고 관리할 수 있습니다.</p></div><div className="list-actions"><label className="search-box"><Search size={17} /><input aria-label="회원 검색" placeholder="이름, 이메일, 전화번호 검색" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} /></label><button className="secondary-button" onClick={exportCsv} disabled={!members?.length}><ArrowDownToLine size={16} />내보내기</button></div></div>
        <div className="table-card"><div className="table-scroll"><table><thead><tr><th>회원 정보</th><th>전화번호</th><th>생년월일</th><th>가입일</th><th className="actions-head">관리</th></tr></thead><tbody>{isLoading ? <tr><td colSpan={5} className="empty-cell">회원 목록을 불러오는 중입니다.</td></tr> : loadError ? <tr><td colSpan={5} className="empty-cell error-text">목록을 불러오지 못했습니다. 다시 새로고침해 주세요.</td></tr> : visible.length ? visible.map(member => <tr key={member.id}><td><div className="member-cell"><span className="avatar">{member.name.slice(0, 1)}</span><span><strong>{member.name}</strong><small><Mail size={13} />{member.email}</small></span></div></td><td className="phone-cell">{member.phone}</td><td>{dateLabel(member.birth_date)}</td><td className="date-cell">{dateTimeLabel(member.created_at)}</td><td><div className="row-actions"><button className="row-button edit-action" onClick={() => beginEdit(member)} aria-label={`${member.name} 수정`}><Pencil size={15} /><span>수정</span></button><button className="row-button delete-action" onClick={() => removeMember(member)} aria-label={`${member.name} 삭제`}><Trash2 size={15} /><span>삭제</span></button></div></td></tr>) : <tr><td colSpan={5} className="empty-cell"><span className="empty-icon"><Users size={23} /></span><strong>{query ? '검색 결과가 없습니다.' : '아직 등록된 회원이 없습니다.'}</strong><span>{query ? '다른 검색어를 입력해 보세요.' : '위 양식에서 첫 회원을 등록해 보세요.'}</span></td></tr>}</tbody></table></div><div className="table-footer"><span>총 <strong>{filtered.length}</strong>명 중 {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)}명</span><div className="pagination"><button aria-label="이전 페이지" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={17} /></button><span>{page} / {pages}</span><button aria-label="다음 페이지" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={17} /></button></div></div></div>
      </section><footer className="app-footer"><span>MemberDesk</span><span>회원 데이터는 암호화된 연결을 통해 안전하게 관리됩니다.</span><ShieldCheck size={15} /></footer>
    </div>
  </main>
}
