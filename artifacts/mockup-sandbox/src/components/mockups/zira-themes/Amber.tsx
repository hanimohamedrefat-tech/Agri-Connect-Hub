export function Amber() {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #fffbeb 0%, #fef3c7 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Cairo', 'Inter', sans-serif",
      }}
    >
      {/* Decorative blobs */}
      <div style={{
        position: "fixed", top: "-60px", left: "-60px",
        width: "240px", height: "240px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: "-80px", right: "-40px",
        width: "300px", height: "300px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(22,101,52,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <header
        style={{
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "12px",
          position: "relative",
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#451a03", lineHeight: 1.1 }}>
            زراعة.كوم
          </div>
          <div style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>عالم الزراعة</div>
        </div>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(217,119,6,0.4)",
            transform: "rotate(-4deg)",
          }}
        >
          <span style={{ fontSize: "22px" }}>🌾</span>
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "380px",
            background: "white",
            borderRadius: "24px",
            border: "1px solid rgba(251,191,36,0.3)",
            boxShadow:
              "0 12px 48px rgba(217,119,6,0.14), 0 2px 12px rgba(0,0,0,0.06)",
            padding: "40px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "22px",
          }}
        >
          {/* Top accent bar */}
          <div style={{
            width: "60px", height: "5px", borderRadius: "99px",
            background: "linear-gradient(90deg, #f59e0b, #d97706)",
          }} />

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "34px", marginBottom: "6px" }}>🌻</div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#451a03", margin: 0, lineHeight: 1.2 }}>
              أهلاً بك
            </h1>
            <p style={{ fontSize: "14px", color: "#92400e", margin: "6px 0 0 0" }}>
              سجّل دخولك أو أنشئ حساباً جديداً
            </p>
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#451a03" }}>
              البريد الإلكتروني أو رقم الهاتف
            </label>
            <input
              placeholder="example@email.com أو 01xxxxxxxxx"
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "12px",
                border: "1.5px solid #fde68a",
                background: "#fffbeb",
                color: "#451a03",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          <button
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "white",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 18px rgba(217,119,6,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontFamily: "inherit",
            }}
          >
            ← متابعة
          </button>

          <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "#fde68a" }} />
            <span style={{ fontSize: "13px", color: "#92400e", opacity: 0.7 }}>أو</span>
            <div style={{ flex: 1, height: "1px", background: "#fde68a" }} />
          </div>

          <button
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "12px",
              border: "1.5px solid #fcd34d",
              background: "transparent",
              color: "#b45309",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            تسجيل الدخول بكلمة المرور
          </button>
        </div>
      </main>

      <footer style={{ padding: "16px", textAlign: "center", position: "relative" }}>
        <p style={{ fontSize: "12px", color: "#92400e", opacity: 0.6, margin: 0 }}>
          زراعة.كوم © 2026 — المنصة الزراعية العربية
        </p>
      </footer>
    </div>
  );
}
