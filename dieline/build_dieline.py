"""Builds milda_wafflebar_dieline.pdf (1:1 scale): bleed artwork + cut / crease / safe-area guides + labels."""
import os
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, Color
from shapely.geometry import box, Point
from shapely.ops import unary_union

here = os.path.dirname(os.path.abspath(__file__)); P = lambda n: os.path.join(here, n)

# ---- die geometry (cm, origin = bottom-left of the front panel) -----------------------
PW, PH, FL, SF, R, BLEED, SAFE = 7, 15, 1.5, 1, 1.5, 0.3, 0.3
def end_flap(x0, top):
    y0 = PH if top else 0
    circ = unary_union([Point(x0 + R, y0).buffer(R, 64), Point(x0 + PW - R, y0).buffer(R, 64), box(x0 + R, y0 - R, x0 + PW - R, y0 + R)])
    return circ.intersection(box(x0, y0, x0 + PW, y0 + FL) if top else box(x0, y0 - FL, x0 + PW, y0))
xf, xs1, xb, xs2, xg, xend = 0, PW, PW + SF, 2 * PW + SF, 2 * PW + 2 * SF, 2 * PW + 3 * SF
die = unary_union([box(xf, 0, xs1, PH), box(xs1, 0, xb, PH), box(xb, 0, xs2, PH), box(xs2, 0, xend, PH),
                   end_flap(xf, True), end_flap(xf, False), end_flap(xb, True), end_flap(xb, False)])
bleed = die.buffer(BLEED, join_style=1, quad_segs=32)

# ---- page ----------------------------------------------------------------------------
W, H = 27 * cm, 26.8 * cm
X0, Y0 = 5.8 * cm, 6.4 * cm
X = lambda x: X0 + x * cm
Y = lambda y: Y0 + y * cm
BROWN = HexColor('#4a1d12'); CUT = HexColor('#e6007e'); CREASE = HexColor('#0095d9')
BLEEDC = HexColor('#f08a00'); SAFEC = HexColor('#1a9a3a')

c = canvas.Canvas(P('milda_wafflebar_dieline.pdf'), pagesize=(W, H))
c.setTitle('Milda - Milk Chocolate Wafflebar - Packaging Dieline'); c.setAuthor('Milda')

def path_from(coords, close=True):
    p = c.beginPath(); pts = list(coords)
    p.moveTo(X(pts[0][0]), Y(pts[0][1]))
    for x, y in pts[1:]: p.lineTo(X(x), Y(y))
    if close: p.close()
    return p

# ---- artwork, clipped to the bleed outline ---------------------------------------------
c.saveState()
c.clipPath(path_from(bleed.exterior.coords), stroke=0, fill=0)
c.drawImage(P('milda_die_art_bleed_600dpi.jpg'), X(-BLEED), Y(-FL - BLEED), (17 + 2 * BLEED) * cm, (PH + 2 * FL + 2 * BLEED) * cm)
c.restoreState()

# ---- guides: bleed, safe area, crease, cut ------------------------------------------------
c.setLineWidth(0.5); c.setStrokeColor(BLEEDC); c.setDash(1.5, 2.5)
c.drawPath(path_from(bleed.exterior.coords), stroke=1, fill=0)
c.setStrokeColor(SAFEC); c.setDash(3, 3)
for x0 in (xf, xb):
    c.rect(X(x0 + SAFE), Y(SAFE), (PW - 2 * SAFE) * cm, (PH - 2 * SAFE) * cm, stroke=1, fill=0)
c.setStrokeColor(CREASE); c.setLineWidth(0.7); c.setDash(4, 3)
for x in (xs1, xb, xs2, xg): c.line(X(x), Y(0), X(x), Y(PH))
for x0 in (xf, xb):
    c.line(X(x0), Y(PH), X(x0 + PW), Y(PH)); c.line(X(x0), Y(0), X(x0 + PW), Y(0))
c.setStrokeColor(CUT); c.setLineWidth(0.9); c.setDash()
c.drawPath(path_from(die.exterior.coords), stroke=1, fill=0)

# ---- labels (one style for every dimension: bar + name + size) -----------------------------
c.setStrokeColor(BROWN); c.setFillColor(BROWN); c.setLineWidth(0.7); c.setDash()
FS_N, FS_D = 8, 11
def dim_h(x0, x1, y, name, size):
    c.line(X(x0), Y(y), X(x1), Y(y)); c.line(X(x0), Y(y) - 3, X(x0), Y(y) + 3); c.line(X(x1), Y(y) - 3, X(x1), Y(y) + 3)
    c.setFont('Helvetica-Bold', FS_N); c.drawCentredString(X((x0 + x1) / 2), Y(y) + 17, name)
    c.setFont('Helvetica-Bold', FS_D); c.drawCentredString(X((x0 + x1) / 2), Y(y) + 5, size)
def dim_v(y0, y1, name, size, x=-1.0):
    c.line(X(x), Y(y0), X(x), Y(y1)); c.line(X(x) - 3, Y(y0), X(x) + 3, Y(y0)); c.line(X(x) - 3, Y(y1), X(x) + 3, Y(y1))
    ym = Y((y0 + y1) / 2)
    c.setFont('Helvetica-Bold', FS_N); c.drawRightString(X(x) - 7, ym + 3, name)
    c.setFont('Helvetica-Bold', FS_D); c.drawRightString(X(x) - 7, ym - 9, size)
ydim = PH + FL + 0.8
dim_h(xf, xf + PW, ydim, 'FRONT PANEL', '7 cm'); dim_h(xb, xb + PW, ydim, 'BACK PANEL', '7 cm')
dim_v(PH, PH + FL, 'TOP END FLAP', '1.5 cm'); dim_v(0, PH, 'PANEL HEIGHT', '15 cm'); dim_v(-FL, 0, 'BOTTOM END FLAP', '1.5 cm')
# the three 1 cm strips: identical treatment (bar below, name rotated inside the strip)
for x0, name in ((xs1, 'SIDE PANEL'), (xs2, 'SIDE PANEL'), (xg, 'GLUE FLAP')):
    yb = -FL - 0.35
    c.line(X(x0), Y(yb), X(x0 + SF), Y(yb)); c.line(X(x0), Y(yb) - 3, X(x0), Y(yb) + 3); c.line(X(x0 + SF), Y(yb) - 3, X(x0 + SF), Y(yb) + 3)
    c.setFont('Helvetica-Bold', FS_D); c.drawCentredString(X(x0 + SF / 2), Y(yb) - 15, '1 cm')
    c.saveState(); c.translate(X(x0 + SF / 2), Y(12.0)); c.rotate(90)
    c.setFont('Helvetica-Bold', FS_N + 1); c.setFillColor(HexColor('#ffffff')); c.setStrokeColor(HexColor('#ffffff'))
    c.drawCentredString(0, -3, name)
    c.restoreState()
    c.setFillColor(BROWN); c.setStrokeColor(BROWN)

# ---- title block + legend --------------------------------------------------------------------
c.setFont('Helvetica-Bold', 13); c.drawString(X(0), Y(-FL) - 2.7 * cm, 'Milda - Milk Chocolate Wafflebar  |  Packaging Dieline')
c.setFont('Helvetica', 8.5)
c.drawString(X(0), Y(-FL) - 3.25 * cm, 'Scale 1:1  |  Panels 7 x 15 cm  |  End flaps 1.5 cm (corner radius 1.5 cm)  |  Side panels 1 cm each  |  Glue flap 1 cm')
c.drawString(X(0), Y(-FL) - 3.7 * cm, 'Artwork carries 3 mm bleed past every cut edge; all type, tables and logos sit inside the 3 mm safe area. Guides are for proofing only.')
items = [(CUT, None, 'Cut'), (CREASE, (4, 3), 'Crease / fold'), (BLEEDC, (1.5, 2.5), 'Bleed (3 mm outside cut)'), (SAFEC, (3, 3), 'Safe area (3 mm inside)')]
x = X(0)
for col, dash, label in items:
    c.setStrokeColor(col); c.setLineWidth(0.9); c.setDash(*dash) if dash else c.setDash()
    c.line(x, Y(-FL) - 4.4 * cm, x + 1 * cm, Y(-FL) - 4.4 * cm)
    c.setFillColor(BROWN); c.setFont('Helvetica', 8.5); c.drawString(x + 1.15 * cm, Y(-FL) - 4.4 * cm - 3, label)
    x += 1.15 * cm + c.stringWidth(label, 'Helvetica', 8.5) + 0.8 * cm
c.showPage(); c.save()
print('ok')
