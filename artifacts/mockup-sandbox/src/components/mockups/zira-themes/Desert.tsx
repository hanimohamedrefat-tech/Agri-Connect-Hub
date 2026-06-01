export function Desert() {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#0d1f12",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Cairo', 'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gradient glow backgrounds */}
      <div style={{
        position: "absolute", top: "-120px", right: "-80px",
        width: "400px", height: "400px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-100px", left: "-60px",
        width: "350px", height: "350px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 65%)",
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
          zIndex: 1,
        }}
      >
        <div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: "#d1fae5", lineHeight: 1.1 }}>
            زراعة.كوم
          </div>
          <div style={{ fontSize: "11px", color: "#6ee7b7", fontWeight: 500 }}>عالم الزراعة</div>
        </div>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #059669, #047857)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(5,150,105,0.5)",
          }}
        >
          <span style={{ fontSize: "22px" }}>🌿</span>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "380px",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
            padding: "40px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "22px",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "34px", marginBottom: "8px" }}>👋</div>
            <h1
              style={{
                fontSize: "27px",
                fontWeight: 800,
                color: "#ecfdf5",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              أهلاً بك
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#6ee7b7",
                margin: "6px 0 0 0",
                opacity: 0.9,
              }}
            >
              سجّل دخولك أو أنشئ حساباً جديداً
            </p>
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#a7f3d0" }}>
              البريد الإلكتروني أو رقم الهاتف
            </label>
            <input
              placeholder="example@email.com أو 01xxxxxxxxx"
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "12px",
                border: "1.5px solid rgba(110,231,183,0.25)",
                background: "rgba(255,255,255,0.07)",
                color: "#ecfdf5",
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
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "white",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(5,150,105,0.5)",
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
            <div style={{ flex: 1, height: "1px", background: "rgba(110,231,183,0.2)" }} />
            <span style={{ fontSize: "13px", color: "#6ee7b7", opacity: 0.7 }}>أو</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(110,231,183,0.2)" }} />
          </div>

          <button
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "12px",
              border: "1.5px solid rgba(110,231,183,0.25)",
              background: "rgba(255,255,255,0.05)",
              color: "#6ee7b7",
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

      <footer
        style={{
          padding: "16px",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <p style={{ fontSize: "12px", color: "#6ee7b7", opacity: 0.4, margin: 0 }}>
          زراعة.كوم © 2026 — المنصة الزراعية العربية
        </p>
      </footer>
    </div>
  );
}
