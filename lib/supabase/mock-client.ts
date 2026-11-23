type MockUser = { id: string; email: string; password?: string; created_at?: string }
type MockSession = { user: MockUser; access_token: string }

const listeners = new Set<(event: string, session: MockSession | null) => void>()

function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {}
}

function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {}
}

function notifyListeners(event: string, session: MockSession | null): void {
  listeners.forEach((listener) => {
    try {
      listener(event, session)
    } catch (e) {
      console.error(e)
    }
  })
}

const DEFAULT_MEMBERS = [
  {
    id: 'mem_1',
    name: '김민수',
    email: 'minsu.kim@example.com',
    phone: '010-1234-5678',
    birth_date: '1990-05-12',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'mem_2',
    name: '이서연',
    email: 'seoyeon.lee@example.com',
    phone: '010-9876-5432',
    birth_date: '1994-08-25',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'mem_3',
    name: '박도현',
    email: 'dohyun.park@example.com',
    phone: '010-5555-8888',
    birth_date: '1988-11-03',
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

function getMembers(): any[] {
  const data = getStorageItem('mock_members')
  if (!data) {
    setStorageItem('mock_members', JSON.stringify(DEFAULT_MEMBERS))
    return DEFAULT_MEMBERS
  }
  try {
    return JSON.parse(data)
  } catch {
    return DEFAULT_MEMBERS
  }
}

function saveMembers(members: any[]): void {
  setStorageItem('mock_members', JSON.stringify(members))
}

function getStoredUsers(): MockUser[] {
  const data = getStorageItem('mock_users')
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

function saveStoredUsers(users: MockUser[]): void {
  setStorageItem('mock_users', JSON.stringify(users))
}

export function createMockClient() {
  return {
    auth: {
      async getSession() {
        const data = getStorageItem('mock_session')
        if (!data) return { data: { session: null }, error: null }
        try {
          const session = JSON.parse(data) as MockSession
          return { data: { session }, error: null }
        } catch {
          return { data: { session: null }, error: null }
        }
      },

      onAuthStateChange(callback: (event: string, session: MockSession | null) => void) {
        listeners.add(callback)
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners.delete(callback)
              },
            },
          },
        }
      },

      async signInWithPassword({ email, password }: { email: string; password: string }) {
        await new Promise((r) => setTimeout(r, 100))
        const users = getStoredUsers()
        const user = users.find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase())

        if (!user || user.password !== password) {
          // If no users exist yet or password doesn't match
          return {
            data: { user: null, session: null },
            error: { message: '이메일 또는 비밀번호를 확인해 주세요.' },
          }
        }

        const session: MockSession = {
          user: { id: user.id, email: user.email },
          access_token: 'mock_jwt_token_' + Date.now(),
        }
        setStorageItem('mock_session', JSON.stringify(session))
        notifyListeners('SIGNED_IN', session)
        return { data: { user: session.user, session }, error: null }
      },

      async signUp({ email, password }: { email: string; password: string; options?: any }) {
        await new Promise((r) => setTimeout(r, 100))
        if (!email || !password) {
          return {
            data: { user: null, session: null },
            error: { message: '이메일과 비밀번호를 입력해 주세요.' },
          }
        }
        if (password.length < 6) {
          return {
            data: { user: null, session: null },
            error: { message: 'Password should be at least 6 characters' },
          }
        }

        const users = getStoredUsers()
        let user = users.find((u) => u.email.trim().toLowerCase() === email.trim().toLowerCase())

        if (!user) {
          user = {
            id: 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
            email: email.trim(),
            password,
            created_at: new Date().toISOString(),
          }
          users.push(user)
          saveStoredUsers(users)
        } else {
          // Update password if existing user re-registers in mock mode
          user.password = password
          saveStoredUsers(users)
        }

        const session: MockSession = {
          user: { id: user.id, email: user.email },
          access_token: 'mock_jwt_token_' + Date.now(),
        }
        setStorageItem('mock_session', JSON.stringify(session))
        notifyListeners('SIGNED_IN', session)
        return { data: { user: session.user, session }, error: null }
      },

      async signOut() {
        removeStorageItem('mock_session')
        notifyListeners('SIGNED_OUT', null)
        return { error: null }
      },
    },

    from(table: string) {
      return {
        select(columns?: string) {
          const run = (ascending = false) => {
            const list = getMembers()
            const sorted = [...list].sort((a, b) => {
              const tA = new Date(a.created_at).getTime()
              const tB = new Date(b.created_at).getTime()
              return ascending ? tA - tB : tB - tA
            })
            return { data: sorted, error: null }
          }

          return {
            order(col: string, { ascending = true }: { ascending?: boolean } = {}) {
              return Promise.resolve(run(ascending))
            },
            then(resolve: any, reject: any) {
              return Promise.resolve(run(false)).then(resolve, reject)
            },
          }
        },

        insert(payload: any) {
          const members = getMembers()
          const duplicate = members.some(
            (m) => m.email.trim().toLowerCase() === String(payload.email).trim().toLowerCase(),
          )
          if (duplicate) {
            return Promise.resolve({
              data: null,
              error: { message: 'duplicate key value violates unique constraint' },
            })
          }

          const newMember = {
            id: 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            birth_date: payload.birth_date,
            created_at: new Date().toISOString(),
          }
          members.unshift(newMember)
          saveMembers(members)
          return Promise.resolve({ data: newMember, error: null })
        },

        update(payload: any) {
          return {
            eq(col: string, val: string) {
              const members = getMembers()
              const index = members.findIndex((m) => m[col] === val)
              if (index === -1) {
                return Promise.resolve({ data: null, error: { message: 'Not found' } })
              }
              if (payload.email) {
                const duplicate = members.some(
                  (m, i) =>
                    i !== index &&
                    m.email.trim().toLowerCase() === String(payload.email).trim().toLowerCase(),
                )
                if (duplicate) {
                  return Promise.resolve({
                    data: null,
                    error: { message: 'duplicate key value violates unique constraint' },
                  })
                }
              }
              members[index] = { ...members[index], ...payload }
              saveMembers(members)
              return Promise.resolve({ data: members[index], error: null })
            },
          }
        },

        delete() {
          return {
            eq(col: string, val: string) {
              let members = getMembers()
              members = members.filter((m) => m[col] !== val)
              saveMembers(members)
              return Promise.resolve({ data: null, error: null })
            },
          }
        },
      }
    },
  }
}
