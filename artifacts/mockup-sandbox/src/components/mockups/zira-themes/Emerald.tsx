export function Emerald() {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #f0fdf4 0%, #dcfce7 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Cairo', 'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#14532d", lineHeight: 1.1 }}>
            زراعة.كوم
          </div>
          <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: 500 }}>عالم الزراعة</div>
        </div>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #16a34a, #15803d)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(21,128,61,0.35)",
          }}
        >
          <span style={{ fontSize: "22px" }}>🌱</span>
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
          gap: "24px",
        }}
      >
        {/* Welcome card */}
        <div
          style={{
            width: "100%",
            maxWidth: "380px",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: "20px",
            border: "1px solid rgba(21,128,61,0.15)",
            boxShadow: "0 8px 40px rgba(21,128,61,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            padding: "36px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "6px" }}>👋</div>
            <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#14532d", margin: 0, lineHeight: 1.2 }}>
              أهلاً بك
            </h1>
            <p style={{ fontSize: "14px", color: "#166534", margin: "6px 0 0 0", opacity: 0.8 }}>
              سجّل دخولك أو أنشئ حساباً جديداً
            </p>
          </div>

          {/* Input */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#14532d" }}>
              البريد الإلكتروني أو رقم الهاتف
            </label>
            <input
              placeholder="example@email.com أو 01xxxxxxxxx"
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "12px",
                border: "1.5px solid #86efac",
                background: "#f0fdf4",
                color: "#14532d",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Button */}
          <button
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
              color: "white",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(21,128,61,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontFamily: "inherit",
            }}
          >
            ← متابعة
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "#bbf7d0" }} />
            <span style={{ fontSize: "13px", color: "#166534", opacity: 0.7 }}>أو</span>
            <div style={{ flex: 1, height: "1px", background: "#bbf7d0" }} />
          </div>

          {/* Secondary button */}
          <button
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "12px",
              border: "1.5px solid #86efac",
              background: "transparent",
              color: "#15803d",
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

      {/* Footer */}
      <footer style={{ padding: "16px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "#166534", opacity: 0.6, margin: 0 }}>
          زراعة.كوم © 2026 — المنصة الزراعية العربية
        </p>
      </footer>
    </div>
  );
}
