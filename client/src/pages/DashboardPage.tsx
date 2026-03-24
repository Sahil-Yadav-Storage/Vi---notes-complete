import Editor from "../components/Editor";
import { SessionProvider } from "../contexts/SessionContext";

const DashboardPage = () => {
  return (
    <section className="dashboard-page">
      <div className="dashboard-headline">
        <h1>Writing Dashboard</h1>
        <p>
          Capture typing behavior and continue editing your notes seamlessly.
        </p>
      </div>

      <SessionProvider>
        <Editor />
      </SessionProvider>
    </section>
  );
};

export default DashboardPage;
