import { FitnessTab } from './components/FitnessTab';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Kine-Sight</h1>
        <span className="badge">AI Coach</span>
      </header>

      <main className="tab-content">
        <FitnessTab />
      </main>
    </div>
  );
}
