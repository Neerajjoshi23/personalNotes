import { Navigate, NavLink, Route, Routes, useParams } from "react-router-dom";
import { LessonPage } from "./LessonPage";
import { groups, lessons } from "./lessons";

function LessonRoute() {
  const { id } = useParams();
  const lesson = lessons.find((item) => item.id === id);

  if (!lesson) {
    return <Navigate to="/lesson/01" replace />;
  }

  // key forces a fresh mount (new form state / new script run) per lesson
  return <LessonPage key={lesson.id} lesson={lesson} />;
}

export function App() {
  return (
    <div className="layout">
      <nav className="sidebar">
        <h1 className="brand">Forms + Zod</h1>
        <p className="muted small">Phase 3 · lesson viewer</p>

        {groups.map((group) => (
          <div key={group}>
            <h3>{group}</h3>
            <ul>
              {lessons
                .filter((lesson) => lesson.group === group)
                .map((lesson) => (
                  <li key={lesson.id}>
                    <NavLink to={`/lesson/${lesson.id}`}>
                      <span className="badge small">{lesson.id}</span>
                      {lesson.title}
                    </NavLink>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>

      <main className="content">
        <Routes>
          <Route path="/lesson/:id" element={<LessonRoute />} />
          <Route path="*" element={<Navigate to="/lesson/01" replace />} />
        </Routes>
      </main>
    </div>
  );
}
