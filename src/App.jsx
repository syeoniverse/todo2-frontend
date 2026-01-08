import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/todos'

const buildApiUrl = (path = '') => {
  const base = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return new URL(cleanPath, base).toString()
}

const readJson = async (response) => {
  try {
    return await response.json()
  } catch (error) {
    return null
  }
}

function App() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyIds, setBusyIds] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.completed).length,
    [todos]
  )

  const pendingCount = todos.length - completedCount

  const setBusy = (id, value) => {
    setBusyIds((prev) => {
      if (value) {
        return prev.includes(id) ? prev : [...prev, id]
      }
      return prev.filter((item) => item !== id)
    })
  }

  const isBusy = (id) => busyIds.includes(id)

  const loadTodos = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(buildApiUrl())
      if (!response.ok) {
        const data = await readJson(response)
        throw new Error(data?.message || 'Failed to load todos')
      }
      const data = await response.json()
      setTodos(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load todos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTodos()
  }, [])

  const handleCreate = async (event) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle) {
      setError('Title is required.')
      return
    }

    setCreating(true)
    setError('')
    try {
      const response = await fetch(buildApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDescription,
          completed: false,
        }),
      })
      if (!response.ok) {
        const data = await readJson(response)
        throw new Error(data?.message || 'Failed to create todo')
      }
      const created = await response.json()
      setTodos((prev) => [created, ...prev])
      setTitle('')
      setDescription('')
    } catch (createError) {
      setError(createError?.message || 'Failed to create todo')
    } finally {
      setCreating(false)
    }
  }

  const toggleComplete = async (todo) => {
    if (!todo?._id) return
    const nextValue = !todo.completed
    setBusy(todo._id, true)
    setError('')
    try {
      const response = await fetch(buildApiUrl(todo._id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: nextValue }),
      })
      if (!response.ok) {
        const data = await readJson(response)
        throw new Error(data?.message || 'Failed to update todo')
      }
      const updated = await response.json()
      setTodos((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item))
      )
    } catch (updateError) {
      setError(updateError?.message || 'Failed to update todo')
    } finally {
      setBusy(todo._id, false)
    }
  }

  const startEdit = (todo) => {
    setEditingId(todo._id)
    setEditTitle(todo.title || '')
    setEditDescription(todo.description || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
    setEditDescription('')
  }

  const saveEdit = async (todo) => {
    const trimmedTitle = editTitle.trim()
    const trimmedDescription = editDescription.trim()
    if (!trimmedTitle) {
      setError('Title is required.')
      return
    }

    setBusy(todo._id, true)
    setError('')
    try {
      const response = await fetch(buildApiUrl(todo._id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDescription,
        }),
      })
      if (!response.ok) {
        const data = await readJson(response)
        throw new Error(data?.message || 'Failed to update todo')
      }
      const updated = await response.json()
      setTodos((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item))
      )
      cancelEdit()
    } catch (updateError) {
      setError(updateError?.message || 'Failed to update todo')
    } finally {
      setBusy(todo._id, false)
    }
  }

  const removeTodo = async (todo) => {
    if (!todo?._id) return
    setBusy(todo._id, true)
    setError('')
    try {
      const response = await fetch(buildApiUrl(todo._id), {
        method: 'DELETE',
      })
      if (!response.ok && response.status !== 204) {
        const data = await readJson(response)
        throw new Error(data?.message || 'Failed to delete todo')
      }
      setTodos((prev) => prev.filter((item) => item._id !== todo._id))
    } catch (deleteError) {
      setError(deleteError?.message || 'Failed to delete todo')
      setBusy(todo._id, false)
    }
  }

  const formatDate = (value) => {
    if (!value) return ''
    try {
      return new Date(value).toLocaleString()
    } catch (error) {
      return ''
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Local Todo Studio</p>
          <h1>할 일 관리</h1>
          <p className="subtext">
            새로운 할 일을 추가하고, 완료 상태를 바꾸거나 내용을 수정하세요.
          </p>
        </div>
        <div className="stats">
          <div className="stat-card">
            <span className="stat-label">전체</span>
            <strong>{todos.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">진행 중</span>
            <strong>{pendingCount}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">완료</span>
            <strong>{completedCount}</strong>
          </div>
        </div>
      </header>

      <section className="panel">
        <form className="todo-form" onSubmit={handleCreate}>
          <div className="field">
            <label htmlFor="title">할 일 제목</label>
            <input
              id="title"
              type="text"
              placeholder="예) 디자인 수정하기"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={creating}
            />
          </div>
          <div className="field">
            <label htmlFor="description">설명</label>
            <textarea
              id="description"
              rows="3"
              placeholder="필요한 메모나 상세 설명을 적어주세요."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={creating}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={creating}>
              {creating ? '추가 중...' : '할 일 추가'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel list-panel">
        <div className="panel-head">
          <h2>Todo List</h2>
          <button
            type="button"
            className="btn ghost"
            onClick={loadTodos}
            disabled={loading}
          >
            새로고침
          </button>
        </div>

        {error && (
          <div className="state error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="state">로딩 중...</div>
        ) : todos.length === 0 ? (
          <div className="state empty">아직 등록된 할 일이 없습니다.</div>
        ) : (
          <ul className="todo-list">
            {todos.map((todo) => {
              const isEditing = editingId === todo._id
              return (
                <li key={todo._id} className={`todo-card${todo.completed ? ' done' : ''}`}>
                  <div className="todo-main">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={!!todo.completed}
                        onChange={() => toggleComplete(todo)}
                        disabled={isBusy(todo._id)}
                      />
                      <span aria-hidden="true" />
                    </label>
                    <div className="todo-content">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(event) => setEditTitle(event.target.value)}
                            disabled={isBusy(todo._id)}
                          />
                          <textarea
                            rows="3"
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                            disabled={isBusy(todo._id)}
                          />
                        </>
                      ) : (
                        <>
                          <h3>{todo.title}</h3>
                          {todo.description && <p>{todo.description}</p>}
                        </>
                      )}
                      <div className="meta">
                        {todo.createdAt && <span>생성: {formatDate(todo.createdAt)}</span>}
                        {todo.updatedAt && <span>수정: {formatDate(todo.updatedAt)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="todo-actions">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn primary"
                          onClick={() => saveEdit(todo)}
                          disabled={isBusy(todo._id)}
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={cancelEdit}
                          disabled={isBusy(todo._id)}
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn outline"
                          onClick={() => startEdit(todo)}
                          disabled={isBusy(todo._id)}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="btn danger"
                          onClick={() => removeTodo(todo)}
                          disabled={isBusy(todo._id)}
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
