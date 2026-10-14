"""Builds milda_wafflebar_dieline.pdf (1:1 scale) from the two panel artworks."""
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.lib.colors import Color, HexColor
from PIL import Image
import numpy as np, os
here = os.path.dirname(os.path.abspath(__file__))
P = lambda n: os.path.join(here, n)

# Flap colour = the levelled pink of the artwork background (see build_art.py)
PINK = Color(252 / 255, 167 / 255, 206 / 255)
BROWN = HexColor('#4a1d12')
CUT = HexColor('#e6007e')      # solid = cut
CREASE = HexColor('#00a3e0')   # dashed = crease/fold

W, H = 26 * cm, 24.7 * cm
X0, Y0 = 4.5 * cm, 4.2 * cm    # bottom-left of the front panel body
PW, PH, FL, SF, R = 7 * cm, 15 * cm, 1.5 * cm, 1 * cm, 1.5 * cm
xf, xs1, xb, xs2, xg = X0, X0 + PW, X0 + PW + SF, X0 + 2 * PW + SF, X0 + 2 * PW + 2 * SF
xend = xg + SF
ytop = Y0 + PH

c = canvas.Canvas(P('milda_wafflebar_dieline.pdf'), pagesize=(W, H))
c.setTitle('MiLda Wafflebar - Packaging Dieline'); c.setAuthor('MiLda')

def rounded_flap(x, y_base, up):
    p = c.beginPath()
    s = 1 if up else -1
    p.moveTo(x, y_base)
    p.lineTo(x, y_base + s * (FL - R))              # zero-length when R == FL
    # left arc
    if up:
        p.arcTo(x, y_base + FL - 2*R, x + 2*R, y_base + FL, startAng=180, extent=-90)
    else:
        p.arcTo(x, y_base - FL, x + 2*R, y_base - FL + 2*R, startAng=180, extent=90)
    p.lineTo(x + PW - R, y_base + s * FL)
    if up:
        p.arcTo(x + PW - 2*R, y_base + FL - 2*R, x + PW, y_base + FL, startAng=90, extent=-90)
    else:
        p.arcTo(x + PW - 2*R, y_base - FL, x + PW, y_base - FL + 2*R, startAng=270, extent=90)
    p.lineTo(x + PW, y_base)
    return p

# --- fills -----------------------------------------------------------------
c.setFillColor(PINK)
for x in (xf, xb):
    for yb, up in ((ytop, True), (Y0, False)):
        c.drawPath(rounded_flap(x, yb, up), stroke=0, fill=1)
c.rect(xs1, Y0, SF, PH, stroke=0, fill=1)
c.rect(xs2, Y0, 2 * SF, PH, stroke=0, fill=1)

# --- artwork (exact panels from the reference design) ----------------------
c.drawImage(P('milda_front_art_600dpi.png'), xf, Y0, PW, PH)
c.drawImage(P('milda_back_art_600dpi.png'), xb, Y0, PW, PH)

# --- crease lines (dashed) -------------------------------------------------
c.setStrokeColor(CREASE); c.setLineWidth(0.6); c.setDash(4, 3)
for x in (xs1, xb, xs2, xg):
    c.line(x, Y0, x, ytop)
for x, w in ((xf, PW), (xb, PW)):
    c.line(x, ytop, x + w, ytop); c.line(x, Y0, x + w, Y0)

# --- cut lines (solid) -----------------------------------------------------
c.setStrokeColor(CUT); c.setLineWidth(0.8); c.setDash()
for x in (xf, xb):
    c.drawPath(rounded_flap(x, ytop, True), stroke=1, fill=0)
    c.drawPath(rounded_flap(x, Y0, False), stroke=1, fill=0)
c.line(xf, Y0, xf, ytop)                                   # front outer edge
for x0_, x1_ in ((xs1, xs1 + SF), (xs2, xend)):            # side / glue flap tops & bottoms
    c.line(x0_, ytop, x1_, ytop); c.line(x0_, Y0, x1_, Y0)
c.line(xend, Y0, xend, ytop)                               # glue flap outer edge

# --- dimensions (as in the reference template) -----------------------------
c.setStrokeColor(BROWN); c.setFillColor(BROWN); c.setDash(); c.setLineWidth(0.7)
def tick_h(x0_, x1_, y, label, size=11):
    c.line(x0_, y, x1_, y)
    c.line(x0_, y - 3, x0_, y + 3); c.line(x1_, y - 3, x1_, y + 3)
    c.setFont('Times-Bold', size); c.drawCentredString((x0_ + x1_) / 2, y + 5, label)
def tick_v(x, y0_, y1_, label, size=11):
    c.line(x, y0_, x, y1_)
    c.line(x - 3, y0_, x + 3, y0_); c.line(x - 3, y1_, x + 3, y1_)
    c.setFont('Times-Bold', size); c.drawRightString(x - 6, (y0_ + y1_) / 2 - 4, label)
ydim = ytop + FL + 0.7 * cm
tick_h(xf, xf + PW, ydim, '7 cm'); tick_h(xb, xb + PW, ydim, '7 cm')
tick_v(xf - 0.7 * cm, ytop, ytop + FL, '1.5 cm')
tick_v(xf - 0.7 * cm, Y0, ytop, '15 cm')
for x0_ in (xs1, xs2, xg):
    tick_h(x0_, x0_ + SF, Y0 - 0.55 * cm, '1 cm', size=9)

# --- title block / legend --------------------------------------------------
c.setFont('Times-Bold', 13); c.drawString(X0, 1.7 * cm, 'Milda - Milk Chocolate Wafflebar  |  Packaging Dieline')
c.setFont('Times-Roman', 9)
c.drawString(X0, 1.2 * cm, 'Scale 1:1  |  Panels 7 x 15 cm  |  End flaps 1.5 cm (R 1.5 cm)  |  Side flap 1 cm  |  Glue flaps 1 cm + 1 cm  |  Overall 17 x 18 cm')
c.setStrokeColor(CUT); c.setLineWidth(0.8); c.line(X0, 0.65 * cm, X0 + 1 * cm, 0.65 * cm)
c.setFillColor(BROWN); c.drawString(X0 + 1.2 * cm, 0.65 * cm - 3, 'Cut')
c.setStrokeColor(CREASE); c.setLineWidth(0.6); c.setDash(4, 3); c.line(X0 + 2.4 * cm, 0.65 * cm, X0 + 3.4 * cm, 0.65 * cm)
c.drawString(X0 + 3.6 * cm, 0.65 * cm - 3, 'Crease / fold')
c.showPage(); c.save()
print('ok', PINK.hexval() if hasattr(PINK, 'hexval') else PINK)
