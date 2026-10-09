import numpy as np,subprocess,sys,os
def load(f,sr=44100):
    x=subprocess.run(['ffmpeg','-v','error','-i',f,'-ac','1','-ar',str(sr),'-f','f32le','-'],capture_output=True).stdout
    return np.frombuffer(x,np.float32),sr
def segs(x,sr,thr=0.75,amp=0.03):
    w=int(sr*0.02);n=len(x)//w;pk=np.abs(x[:n*w]).reshape(n,w).max(1)
    out=[];sil=0;start=None
    for i,m in enumerate(pk):
        t=i*0.02
        if m<amp: sil+=0.02
        else:
            if start is None: start=t
            elif sil>=thr: out.append((start,t-sil)); start=t
            sil=0
    out.append((start,n*0.02-sil))
    return out
def cut(f,outs,thr=0.75):
    x,sr=load(f);S=segs(x,sr,thr)
    if len(S)!=len(outs): return len(S)
    for (a,b),o in zip(S,outs):
        a=max(0,a-0.06);b=b+0.08
        subprocess.run(['ffmpeg','-v','error','-y','-ss',f'{a:.3f}','-to',f'{b:.3f}','-i',f,'-af','afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse,loudnorm=I=-15:TP=-1.5,apad=pad_dur=0.1','-ac','1','-ar','44100','-b:a','64k',o],check=True)
    return True
if __name__=='__main__':
    x,sr=load(sys.argv[1]);print([(round(a,2),round(b,2)) for a,b in segs(x,sr)])
