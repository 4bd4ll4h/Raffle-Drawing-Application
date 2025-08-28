import React, { useEffect, useState } from "react";
import { Layout, Typography, Spin } from "antd";
import { WorkflowProvider } from "./context/WorkflowContext";
import WorkflowManager from "./components/WorkflowManager";
import UpdaterComponent from "./components/UpdaterComponent";

const { Header } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string>("");
  const [platform, setPlatform] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("Initializing app...");

        // Check if electronAPI is available
        if (window.electronAPI) {
          const version = await window.electronAPI.getVersion();
          const platformInfo = await window.electronAPI.getPlatform();

          console.log("App version:", version, "Platform:", platformInfo);
          setAppVersion(version);
          setPlatform(platformInfo);
        } else {
          console.warn("ElectronAPI not available, using fallback values");
          setAppVersion("1.0.0");
          setPlatform("unknown");
        }

        console.log("App initialized successfully");
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (loading) {
    return (
      <Layout style={{ height: "100vh" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  return (
    <WorkflowProvider>
      <Layout style={{ height: "100vh" }}>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <Title level={3} style={{ margin: 0, color: "#1890ff" }}>
            Raffle Drawing Application
          </Title>
          <div style={{ marginLeft: "auto", fontSize: "12px", color: "#666" }}>
            v{appVersion} | {platform}
          </div>
        </Header>

        {/* Auto-updater component */}
        <UpdaterComponent />

        {/* Main workflow manager handles all routing and state */}
        <WorkflowManager />
      </Layout>
    </WorkflowProvider>
  );
};

export default App;
