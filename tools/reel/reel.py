"""Builds the portrait reel (1080 x 1920, 30 fps) from the site's own footage and photographs."""
import subprocess, os
R = '/home/user/.review/reel/'; P = '/home/user/public/'
ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', '60', '-an']
def run(args): subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)
def caption(v, cap, dur):
    """Overlay a caption that fades in and out, on the segment's own clock."""
    return f"[{cap}]scale=2160:3840,format=rgba,fade=t=in:st=0.35:d=0.5:alpha=1,fade=t=out:st={dur - 0.9:.2f}:d=0.5:alpha=1[c];[{v}][c]overlay=0:0:format=auto"
def slides(name, images, crop_x, each, fade, cap, zoom=0.06):
    """Photographs dissolving into each other, with one slow continuous push in."""
    total = each * len(images) - fade * (len(images) - 1)
    inputs = []
    for img in images: inputs += ['-loop', '1', '-t', f'{each}', '-i', P + img]
    inputs += ['-loop', '1', '-t', f'{total}', '-i', R + cap]
    f = ''.join(f"[{i}]crop=891:1584:{crop_x}:0,scale=2160:3840:flags=lanczos,fps=60,setsar=1[s{i}];" for i in range(len(images)))
    last = 's0'
    for i in range(1, len(images)):
        f += f"[{last}][s{i}]xfade=transition=fade:duration={fade}:offset={i * (each - fade):.3f}[x{i}];"; last = f'x{i}'
    n = int(total * 60)
    f += f"[{last}]scale=3240:5760:flags=bicubic,zoompan=z='1+{zoom}*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=2160x3840:fps=60[z];" + caption('z', len(images), total)
    run([*inputs, '-filter_complex', f, '-t', f'{total}', *ENC, R + name]); return total
segs = []
# A: the hero clip, centre of the picture, a little faster
run(['-i', '/home/user/.review/sg/orbit.mp4', '-loop', '1', '-t', '6', '-i', R + 'cap-a.png', '-filter_complex',
     "[0]setpts=0.6*PTS,crop=608:1080:656:0,minterpolate=fps=60:mi_mode=blend,scale=2160:3840:flags=lanczos,unsharp=7:7:0.5,setsar=1[v];" + caption('v', 1, 6.0), '-t', '6', *ENC, R + 'a.mp4']); segs.append(('a.mp4', 6.0))
# B: the scroll film (portrait frames), played straight through
run(['-framerate', '60', '-i', P + 'film/plan/p/f-%03d.webp', '-loop', '1', '-t', '5.4', '-i', R + 'cap-b.png', '-filter_complex',
     "[0]scale=2160:3840:flags=lanczos,unsharp=7:7:0.5,fps=60,setsar=1[v];" + caption('v', 1, 5.4), '-t', '5.4', *ENC, R + 'b.mp4']); segs.append(('b.mp4', 5.4))
L = 'cfg/living/'
segs.append(('c.mp4', slides('c.mp4', [L + 'empty.webp', L + 'walnut-1.webp', L + 'walnut-2.webp', L + 'walnut-3.webp'], 1650, 1.7, 0.5, 'cap-c.png')))
segs.append(('d.mp4', slides('d.mp4', [L + 'walnut-3.webp', L + 'stone-3.webp', L + 'olive-3.webp', L + 'marble-3.webp', L + 'terracotta-3.webp'], 1650, 1.05, 0.3, 'cap-d.png', 0.04)))
segs.append(('e.mp4', slides('e.mp4', [L + 'pre/walnut-3-sofa-1.webp', L + 'pre/walnut-3-sofa-2.webp', L + 'pre/walnut-3-sofa-3.webp', L + 'pre/walnut-3-rug-2.webp'], 1650, 1.15, 0.25, 'cap-e.png', 0.04)))
run(['-loop', '1', '-t', '3.6', '-i', R + 'end.png', '-vf', "fps=60,scale=2160:3840,setsar=1,fade=t=in:st=0:d=0.5", *ENC, R + 'f.mp4']); segs.append(('f.mp4', 3.6))
# join with short dissolves, add a silent sound track (Instagram expects one)
X = 0.4; inputs = []; f = ''; last = '0:v'; at = 0
for name, _ in segs: inputs += ['-i', R + name]
for i in range(1, len(segs)):
    at += segs[i - 1][1] - X
    f += f"[{last}][{i}:v]xfade=transition={'fade' if i < len(segs) - 1 else 'fadeblack'}:duration={X}:offset={at:.3f}[j{i}];"; last = f'j{i}'
total = at + segs[-1][1]
out = '/home/user/public/reel/c-studio-interior-reel-4k.mp4'; os.makedirs(os.path.dirname(out), exist_ok=True)
run([*inputs, '-f', 'lavfi', '-t', f'{total}', '-i', 'anullsrc=r=48000:cl=stereo', '-filter_complex', f + f"[{last}]fade=t=out:st={total - 0.5:.2f}:d=0.5,format=yuv420p[v]", '-map', '[v]', '-map', f'{len(segs)}:a',
     '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-maxrate', '24M', '-bufsize', '48M', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '60', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-t', f'{total}', out])
print('reel', round(total, 1), 's', os.path.getsize(out) // 1024, 'KB')
