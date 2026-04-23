"""
CancerScan – AI Powered Lung Cancer Detection System
Login & Registration System
Dark Futuristic Glassmorphism Theme
"""
import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageTk, ImageEnhance, ImageFilter
import database
import os
import sys
import re
import math
import random
import time

# ── Ensure DB ────────────────────────────────────────────────────────────────
database.init_db()

# ── Constants ─────────────────────────────────────────────────────────────────
WIN_W, WIN_H   = 1280, 780
BG_DARK        = "#041C32"
CYAN           = "#00D4FF"
CYAN_DARK      = "#0096B4"
CYAN_GLOW      = "#00FFFF"
GLASS_BG       = "#0A2540"
CARD_ALPHA     = "#0B1E33"  # Slightly lighter for better 'glass' feel
WHITE          = "#FFFFFF"
LIGHT_TEXT     = "#CBD5E1"
MUTED_TEXT     = "#64748B"
ERROR_RED      = "#FF4757"
SUCCESS_GREEN  = "#00D4AA"
BORDER_COLOR   = "#1E4D6B"
BG_IMG_PATH    = os.path.join(os.path.dirname(os.path.abspath(__file__)), "LoginImage.jpg")

FONT_TITLE  = ("Helvetica", 24, "bold")
FONT_SUB    = ("Helvetica", 9)
FONT_LABEL  = ("Helvetica", 10, "bold")
FONT_INPUT  = ("Helvetica", 11)
FONT_BTN    = ("Helvetica", 12, "bold")
FONT_LINK   = ("Helvetica", 9, "underline")
FONT_SMALL  = ("Helvetica", 9)

# ═══════════════════════════════════════════════════════════════════════════════
#  PARTICLE SYSTEM
# ═══════════════════════════════════════════════════════════════════════════════
class Particle:
    def __init__(self, w, h):
        self.reset(w, h)

    def reset(self, w, h):
        self.x  = random.uniform(0, w)
        self.y  = random.uniform(0, h)
        self.vx = random.uniform(-0.4, 0.4)
        self.vy = random.uniform(-0.6, -0.1)
        self.r  = random.uniform(1.5, 3.5)
        self.alpha = random.uniform(0.3, 0.9)
        self.life  = random.uniform(60, 200)
        self.age   = 0

    def step(self, w, h):
        self.x  += self.vx
        self.y  += self.vy
        self.age += 1
        if self.age > self.life or self.x < 0 or self.x > w or self.y < 0:
            self.reset(w, h)


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════
class CancerScanApp:
    def __init__(self, root):
        self.root = root
        self.root.title("CancerScan – AI Powered Lung Cancer Detection")
        self.root.geometry(f"{WIN_W}x{WIN_H}")
        self.root.resizable(True, True)
        self.root.configure(bg=BG_DARK)

        self._bg_photo    = None
        self._show_pw     = False
        self._show_reg_pw = False
        self._show_reg_cpw= False
        self._particles   = []
        self._anim_running= True
        self._current_page= "login"   # "login" | "register"

        # ── Canvas (full window) ──────────────────────────────────────────────
        self.canvas = tk.Canvas(root, bg=BG_DARK, highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)

        # ── Init particles ────────────────────────────────────────────────────
        for _ in range(60):
            self._particles.append(Particle(WIN_W, WIN_H))

        # ── Build pages ───────────────────────────────────────────────────────
        self._build_login_page()
        self._build_register_page()

        # ── Draw & animate ────────────────────────────────────────────────────
        self.root.bind("<Configure>", self._on_resize)
        self._draw_bg()
        self._animate()

        # ── Show login first ──────────────────────────────────────────────────
        self.root.after(80, self._show_login)

    # ─────────────────────────────────────────────────────────────────────────
    #  BACKGROUND
    # ─────────────────────────────────────────────────────────────────────────
    def _draw_bg(self):
        w = self.root.winfo_width()  or WIN_W
        h = self.root.winfo_height() or WIN_H
        self.canvas.delete("bg")

        try:
            img = Image.open(BG_IMG_PATH).convert("RGB")
            ir  = img.width / img.height
            wr  = w / h
            if wr > ir:
                nw, nh = w, int(w / ir)
            else:
                nh, nw = h, int(h * ir)
            img = img.resize((nw, nh), Image.LANCZOS)
            lft = (nw - w) // 2
            top = (nh - h) // 2
            img = img.crop((lft, top, lft + w, top + h))
            img = ImageEnhance.Brightness(img).enhance(0.35)   # heavy darken
            self._bg_photo = ImageTk.PhotoImage(img)
            self.canvas.create_image(0, 0, anchor="nw", image=self._bg_photo, tags="bg")
        except Exception:
            self.canvas.create_rectangle(0, 0, w, h, fill=BG_DARK, outline="", tags="bg")

        self._raise_all()

    def _animate(self):
        if not self._anim_running:
            return
        w = self.root.winfo_width()  or WIN_W
        h = self.root.winfo_height() or WIN_H
        self.canvas.delete("particle")
        for p in self._particles:
            p.step(w, h)
            frac = 1 - p.age / max(p.life, 1)
            bright = int(180 * frac * p.alpha)
            color = f"#{bright:02x}{min(255, bright + 80):02x}{min(255, bright + 120):02x}"
            x, y, r = p.x, p.y, p.r * frac
            if r > 0.5:
                self.canvas.create_oval(x-r, y-r, x+r, y+r, fill=color, outline="", tags="particle")
        self._raise_all()
        self.root.after(40, self._animate)

    def _raise_all(self):
        for tag in ("login_card", "reg_card"):
            self.canvas.tag_raise(tag)

    def _on_resize(self, event):
        if event.widget == self.root:
            w, h = event.width, event.height
            if self._current_page == "login":
                self.canvas.coords(self._login_win, int(w * 0.77), h // 2)
            else:
                self.canvas.coords(self._reg_win, w // 2, h // 2)
            self._draw_bg()

    # ─────────────────────────────────────────────────────────────────────────
    #  HELPERS
    # ─────────────────────────────────────────────────────────────────────────
    def _glass_frame(self, tag, padx=45, pady=25):
        """Return a Frame with glassmorphism dark style."""
        outer = tk.Frame(self.canvas, bg=BORDER_COLOR, padx=1, pady=1)
        inner = tk.Frame(outer, bg=CARD_ALPHA, padx=padx, pady=pady)
        inner.pack(fill="both", expand=True)
        return outer, inner

    def _section_label(self, parent, text):
        tk.Label(parent, text=text, font=FONT_LABEL,
                 bg=CARD_ALPHA, fg=LIGHT_TEXT).pack(anchor="w", pady=(10, 2))

    def _input_field(self, parent, placeholder="", show=""):
        frame = tk.Frame(parent, bg=GLASS_BG, highlightbackground=BORDER_COLOR,
                         highlightthickness=1)
        frame.pack(fill=tk.X, pady=(0, 2))
        e = tk.Entry(frame, font=FONT_INPUT, bg=GLASS_BG, fg=WHITE,
                     insertbackground=CYAN, relief="flat", show=show,
                     highlightthickness=0, bd=6)
        e.pack(fill=tk.X, ipady=4, padx=4)
        # focus glow
        e.bind("<FocusIn>",  lambda ev: frame.config(highlightbackground=CYAN))
        e.bind("<FocusOut>", lambda ev: frame.config(highlightbackground=BORDER_COLOR))
        return e

    def _error_label(self, parent):
        lbl = tk.Label(parent, text="", font=FONT_SMALL,
                       bg=CARD_ALPHA, fg=ERROR_RED)
        lbl.pack(anchor="w")
        return lbl

    def _cyan_button(self, parent, text, command, width=28):
        btn = tk.Button(parent, text=text, command=command,
                        bg=CYAN, fg=BG_DARK, font=FONT_BTN,
                        relief="flat", cursor="hand2",
                        width=width, pady=10, bd=0,
                        activebackground=CYAN_GLOW, activeforeground=BG_DARK)
        btn.pack(fill=tk.X, pady=(18, 6))
        btn.bind("<Enter>", lambda e: btn.config(bg=CYAN_GLOW))
        btn.bind("<Leave>", lambda e: btn.config(bg=CYAN))
        return btn

    def _link_label(self, parent, text, command):
        lbl = tk.Label(parent, text=text, font=FONT_LINK,
                       bg=CARD_ALPHA, fg=CYAN, cursor="hand2")
        lbl.bind("<Button-1>", lambda e: command())
        lbl.bind("<Enter>", lambda e: lbl.config(fg=CYAN_GLOW))
        lbl.bind("<Leave>", lambda e: lbl.config(fg=CYAN))
        return lbl

    # ─────────────────────────────────────────────────────────────────────────
    #  LOGIN PAGE  (Phase 2)
    # ─────────────────────────────────────────────────────────────────────────
    def _build_login_page(self):
        outer, card = self._glass_frame("login_card")
        self._login_outer = outer
        self._login_card  = card

        # ── Branding ─────────────────────────────────────────────────────────
        tk.Label(card, text="🫁", font=("Helvetica", 38),
                 bg=CARD_ALPHA, fg=CYAN).pack(pady=(0, 4))
        tk.Label(card, text="CancerScan", font=FONT_TITLE,
                 bg=CARD_ALPHA, fg=WHITE).pack()
        tk.Label(card, text="AI Powered Lung Cancer Detection System",
                 font=FONT_SUB, bg=CARD_ALPHA, fg=MUTED_TEXT).pack(pady=(2, 4))
        # Cyan divider
        tk.Frame(card, bg=CYAN, height=2, width=260).pack(pady=(6, 16))

        # ── Username ──────────────────────────────────────────────────────────
        self._section_label(card, "👤  Username")
        self._l_user = self._input_field(card)
        self._l_user_err = self._error_label(card)

        # ── Password ──────────────────────────────────────────────────────────
        self._section_label(card, "🔒  Password")
        pw_wrap = tk.Frame(card, bg=CARD_ALPHA)
        pw_wrap.pack(fill=tk.X)
        pw_frame = tk.Frame(pw_wrap, bg=GLASS_BG,
                            highlightbackground=BORDER_COLOR, highlightthickness=1)
        pw_frame.pack(fill=tk.X, pady=(0, 2))
        self._l_pass = tk.Entry(pw_frame, font=FONT_INPUT, bg=GLASS_BG,
                                fg=WHITE, insertbackground=CYAN, relief="flat",
                                show="*", highlightthickness=0, bd=6)
        self._l_pass.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=4, padx=4)
        self._l_pass.bind("<FocusIn>",  lambda e: pw_frame.config(highlightbackground=CYAN))
        self._l_pass.bind("<FocusOut>", lambda e: pw_frame.config(highlightbackground=BORDER_COLOR))
        # Show/Hide toggle
        self._l_eye_btn = tk.Button(pw_frame, text="👁", bg=GLASS_BG, fg=MUTED_TEXT,
                                    relief="flat", bd=0, cursor="hand2",
                                    command=self._toggle_login_pw,
                                    activebackground=GLASS_BG)
        self._l_eye_btn.pack(side=tk.RIGHT, padx=6)
        self._l_pass_err = self._error_label(card)

        # ── Remember Me ───────────────────────────────────────────────────────
        self._remember = tk.IntVar()
        rem_row = tk.Frame(card, bg=CARD_ALPHA)
        rem_row.pack(fill=tk.X, pady=(6, 0))
        tk.Checkbutton(rem_row, text=" Remember Me", variable=self._remember,
                       bg=CARD_ALPHA, fg=LIGHT_TEXT, activebackground=CARD_ALPHA,
                       selectcolor=GLASS_BG, font=FONT_SMALL,
                       activeforeground=CYAN).pack(side=tk.LEFT)

        # ── Role ──────────────────────────────────────────────────────────────
        self._section_label(card, "🏥  Login As")
        self._role = tk.StringVar(value="pathologist")
        role_row = tk.Frame(card, bg=CARD_ALPHA)
        role_row.pack(fill=tk.X, pady=(2, 0))
        for val, txt in [("pathologist", "  Pathologist"), ("admin", "  Admin")]:
            tk.Radiobutton(role_row, text=txt, variable=self._role, value=val,
                           bg=CARD_ALPHA, fg=LIGHT_TEXT, selectcolor=GLASS_BG,
                           activebackground=CARD_ALPHA, font=FONT_SMALL,
                           activeforeground=CYAN).pack(side=tk.LEFT, padx=(0, 20))

        # ── Login Button ──────────────────────────────────────────────────────
        self._cyan_button(card, "⚡  LOGIN", self._do_login, width=26)

        # ── Footer links ──────────────────────────────────────────────────────
        foot = tk.Frame(card, bg=CARD_ALPHA)
        foot.pack(fill=tk.X, pady=(4, 0))
        self._link_label(foot, "Forgot Password?", self._forgot_pw).pack(side=tk.LEFT)
        self._link_label(foot, "Register Here →", self._show_register).pack(side=tk.RIGHT)

        # ── Place on canvas (right side of screen) ────────────────────────────
        self._login_win = self.canvas.create_window(
            int(WIN_W * 0.77), WIN_H // 2,
            window=outer, anchor="center", tags=("login_card",)
        )

    def _toggle_login_pw(self):
        self._show_pw = not self._show_pw
        self._l_pass.config(show="" if self._show_pw else "*")
        self._l_eye_btn.config(text="🙈" if self._show_pw else "👁")

    def _do_login(self):
        user = self._l_user.get().strip()
        pw   = self._l_pass.get().strip()
        ok   = True

        self._l_user_err.config(text="")
        self._l_pass_err.config(text="")

        if not user:
            self._l_user_err.config(text="⚠ Username cannot be empty")
            ok = False
        if not pw:
            self._l_pass_err.config(text="⚠ Password cannot be empty")
            ok = False
        elif len(pw) < 6:
            self._l_pass_err.config(text="⚠ Password must be at least 6 characters")
            ok = False
        if not ok:
            return

        db_role = database.verify_user(user, pw)
        if db_role:
            selected = self._role.get()
            if db_role == selected:
                self._anim_running = False
                self.root.destroy()
                self._launch_app(db_role)
            else:
                messagebox.showerror("Access Denied",
                    f"Your account role is '{db_role}', not '{selected}'.\nPlease select the correct role.")
        else:
            messagebox.showerror("Login Failed", "Invalid username or password.")

    def _forgot_pw(self):
        messagebox.showinfo("Forgot Password",
            "Please contact your system administrator to reset your password.")

    def _launch_app(self, role):
        if role == "admin":
            os.system("python admin_panel.py")
        elif role == "pathologist":
            os.system("python test_ui3.py")

    # ─────────────────────────────────────────────────────────────────────────
    #  REGISTER PAGE  (Phase 3)
    # ─────────────────────────────────────────────────────────────────────────
    def _build_register_page(self):
        outer, card = self._glass_frame("reg_card")
        self._reg_outer = outer
        self._reg_card  = card

        # ── Title ─────────────────────────────────────────────────────────────
        tk.Label(card, text="Create Pathologist Account",
                 font=("Helvetica", 17, "bold"),
                 bg=CARD_ALPHA, fg=WHITE).pack(pady=(0, 2))
        tk.Label(card, text="CancerScan – Registration",
                 font=FONT_SUB, bg=CARD_ALPHA, fg=MUTED_TEXT).pack()
        tk.Frame(card, bg=CYAN, height=2).pack(fill=tk.X, pady=(8, 14))

        # ── Two-column grid ───────────────────────────────────────────────────
        grid = tk.Frame(card, bg=CARD_ALPHA)
        grid.pack(fill=tk.X)

        def col_field(parent, col, label, show=""):
            col_fr = tk.Frame(parent, bg=CARD_ALPHA, padx=6)
            col_fr.grid(row=0, column=col, sticky="ew", padx=4)
            parent.columnconfigure(col, weight=1)
            tk.Label(col_fr, text=label, font=FONT_SMALL,
                     bg=CARD_ALPHA, fg=LIGHT_TEXT).pack(anchor="w", pady=(4, 1))
            e = self._input_field(col_fr, show=show)
            err = self._error_label(col_fr)
            return e, err

        self._r_name, self._r_name_err     = col_field(grid, 0, "👤 Full Name")
        self._r_email, self._r_email_err   = col_field(grid, 1, "✉️ Email")

        grid2 = tk.Frame(card, bg=CARD_ALPHA)
        grid2.pack(fill=tk.X, pady=(4, 0))
        self._r_mobile, self._r_mobile_err = col_field(grid2, 0, "📱 Mobile (10 digits)")
        self._r_hosp, _                    = col_field(grid2, 1, "🏥 Hospital / Organization")

        grid3 = tk.Frame(card, bg=CARD_ALPHA)
        grid3.pack(fill=tk.X, pady=(4, 0))
        self._r_lic, self._r_lic_err       = col_field(grid3, 0, "🪪 Medical License ID")
        self._r_uname, self._r_uname_err   = col_field(grid3, 1, "🔑 Username")

        grid4 = tk.Frame(card, bg=CARD_ALPHA)
        grid4.pack(fill=tk.X, pady=(4, 0))
        self._r_pw, self._r_pw_err         = col_field(grid4, 0, "🔒 Password (min 6)", show="*")
        self._r_cpw, self._r_cpw_err       = col_field(grid4, 1, "🔒 Confirm Password", show="*")

        # Show/Hide for passwords
        self._reg_show_pw = False
        def _toggle_reg_pw():
            self._reg_show_pw = not self._reg_show_pw
            self._r_pw.config(show="" if self._reg_show_pw else "*")
            self._r_cpw.config(show="" if self._reg_show_pw else "*")
        tk.Button(card, text="👁 Show / Hide passwords",
                  command=_toggle_reg_pw, bg=CARD_ALPHA, fg=MUTED_TEXT,
                  relief="flat", font=FONT_SMALL, cursor="hand2",
                  bd=0, activebackground=CARD_ALPHA).pack(anchor="w", pady=(2, 0))

        # ── Success msg ───────────────────────────────────────────────────────
        self._r_success = tk.Label(card, text="", font=FONT_SMALL,
                                   bg=CARD_ALPHA, fg=SUCCESS_GREEN)
        self._r_success.pack(anchor="w")

        # ── Submit button ─────────────────────────────────────────────────────
        self._cyan_button(card, "✅  REGISTER", self._do_register)

        # ── Back to login ─────────────────────────────────────────────────────
        back = tk.Frame(card, bg=CARD_ALPHA)
        back.pack(fill=tk.X)
        self._link_label(back, "← Back to Login", self._show_login).pack(side=tk.LEFT)

        # ── Place on canvas (centered, hidden initially) ───────────────────────
        self._reg_win = self.canvas.create_window(
            WIN_W // 2, WIN_H // 2,
            window=outer, anchor="center", tags=("reg_card",)
        )
        self.canvas.itemconfigure(self._reg_win, state="hidden")

    def _do_register(self):
        # Gather
        name   = self._r_name.get().strip()
        email  = self._r_email.get().strip()
        mobile = self._r_mobile.get().strip()
        hosp   = self._r_hosp.get().strip()
        lic    = self._r_lic.get().strip()
        uname  = self._r_uname.get().strip()
        pw     = self._r_pw.get().strip()
        cpw    = self._r_cpw.get().strip()

        # Reset errors
        for lbl in [self._r_name_err, self._r_email_err, self._r_mobile_err,
                    self._r_lic_err, self._r_uname_err, self._r_pw_err, self._r_cpw_err]:
            lbl.config(text="")
        self._r_success.config(text="")

        ok = True
        def err(lbl, msg):
            nonlocal ok
            lbl.config(text=f"⚠ {msg}")
            ok = False

        if not name:
            err(self._r_name_err, "Full name is required")
        if not email or not re.match(r"^[\w.+-]+@[\w-]+\.\w+$", email):
            err(self._r_email_err, "Enter a valid email address")
        if not mobile.isdigit() or len(mobile) != 10:
            err(self._r_mobile_err, "Mobile must be exactly 10 digits")
        if not lic:
            err(self._r_lic_err, "License ID is required")
        if not uname:
            err(self._r_uname_err, "Username is required")
        if len(pw) < 6:
            err(self._r_pw_err, "Password must be ≥ 6 characters")
        if pw != cpw:
            err(self._r_cpw_err, "Passwords do not match")

        if not ok:
            return

        # Check duplicates via database
        conn = None
        try:
            conn = database.get_connection()
            cur  = conn.cursor()
            cur.execute("SELECT id FROM doctors WHERE email = ?", (uname,))  # Using 'doctors' and 'email' as per db.py
            if cur.fetchone():
                err(self._r_uname_err, "Email already taken")
                ok = False
        except Exception:
            pass
        finally:
            if conn:
                conn.close()

        if not ok:
            return

        # Save user
        try:
            success = database.add_user({
                "username": uname,
                "password": pw,
                "role": "pathologist",
                "full_name": name,
                "email": email,
                "mobile": mobile,
                "hospital": hosp,
                "license_id": lic,
            })
            if success:
                self._r_success.config(text="✅ Registration successful! Redirecting to login...")
                self.root.after(2000, self._show_login)
            else:
                messagebox.showerror("Error", "Registration failed. Please try again.")
        except Exception as ex:
            # Graceful fallback if add_user doesn't accept extra fields
            try:
                database.add_user({"username": uname, "password": pw, "role": "pathologist"})
                self._r_success.config(text="✅ Registration successful! Redirecting to login...")
                self.root.after(2000, self._show_login)
            except Exception as ex2:
                messagebox.showerror("Error", f"Registration failed:\n{ex2}")

    # ─────────────────────────────────────────────────────────────────────────
    #  PAGE SWITCHING  (Phase 4)
    # ─────────────────────────────────────────────────────────────────────────
    def _show_login(self):
        self._current_page = "login"
        self.canvas.itemconfigure(self._reg_win, state="hidden")
        self.canvas.itemconfigure(self._login_win, state="normal")
        w = self.root.winfo_width() or WIN_W
        h = self.root.winfo_height() or WIN_H
        self.canvas.coords(self._login_win, int(w * 0.77), h // 2)
        self._raise_all()

    def _show_register(self):
        self._current_page = "register"
        self.canvas.itemconfigure(self._login_win, state="hidden")
        self.canvas.itemconfigure(self._reg_win, state="normal")
        w = self.root.winfo_width() or WIN_W
        h = self.root.winfo_height() or WIN_H
        self.canvas.coords(self._reg_win, w // 2, h // 2)
        self._raise_all()


# ═══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    root = tk.Tk()
    app  = CancerScanApp(root)
    root.update()
    app._draw_bg()
    root.mainloop()
