"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type NewsItem = { sourceId:string; sourceName:string; title:string; link:string; summary:string; editorialSummary?:string; whyImportant?:string; publishedAt:string|null; imageUrl?:string; imageTitle?:string; fallbackImageUrl?:string; fallbackImageTitle?:string };
type DailyBulletin = { news:NewsItem[]; speechSegments?:{type:string;index:number;text:string}[]; generatedAt?:string };
const categories:Record<string,string> = { sincan:"Sincan", etimesgut:"Etimesgut", "google-sincan":"Sincan & Etimesgut", ankara:"Ankara", "google-ankara":"Ankara", "trt-turkiye":"Türkiye", "aa-guncel":"Türkiye", "bbc-turkce":"Türkiye", "trt-dunya":"Dünya", "aa-dunya":"Dünya", "bbc-dunya":"Dünya", tubitak:"Bilim & Teknoloji", "tubitak-uzay":"Bilim & Uzay", "trt-uzay":"Bilim & Uzay", nasa:"Bilim & Uzay" };
function storySlug(item:NewsItem) { const title=item.title.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80); return `${title}-${item.sourceId}`; }
function dateLabel(value:string|null) { if(!value)return ""; const date=new Date(value); return Number.isNaN(date.getTime())?"":date.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"long",timeStyle:"short"}); }

export default function ArticlePage() {
 const params=useParams<{slug:string}>(); const slug=decodeURIComponent(params.slug);
 const [bulletin,setBulletin]=useState<DailyBulletin|null>(null); const [failed,setFailed]=useState(false); const [detailedSummary,setDetailedSummary]=useState<string|null>(null); const [summaryLoading,setSummaryLoading]=useState(false); const [resolvedSourceUrl,setResolvedSourceUrl]=useState<string|null>(null);
 useEffect(()=>{ let active=true; fetch("/data/daily.json?t="+Date.now(),{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("Haberler alınamadı");return r.json();}).then((data:DailyBulletin)=>{if(active&&Array.isArray(data.news))setBulletin(data);else if(active)setFailed(true);}).catch(()=>{if(active)setFailed(true);}); return()=>{active=false;}; },[]);
 const stories=bulletin?.news; const articleIndex=stories?.findIndex(item=>storySlug(item)===slug) ?? -1; const article=articleIndex>=0?stories?.[articleIndex]:undefined; const narration=bulletin?.speechSegments?.find(segment=>segment.type==="story"&&segment.index===articleIndex+1)?.text; const rssSummary=article?.summary?.trim(); const usefulSourceSummary=rssSummary&&rssSummary.length>35&&rssSummary.toLocaleLowerCase("tr-TR")!==article?.sourceName.toLocaleLowerCase("tr-TR")?rssSummary:undefined;\n useEffect(()=>{ if(!article?.link){setDetailedSummary(null);setResolvedSourceUrl(null);return;} let active=true; setSummaryLoading(true); setDetailedSummary(null); setResolvedSourceUrl(null); fetch("/api/article-summary?url="+encodeURIComponent(article.link),{cache:"no-store"}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Ayrıntılı özet alınamadı.");return data as {summary:string;sourceUrl?:string};}).then(data=>{if(active){setDetailedSummary(data.summary);setResolvedSourceUrl(data.sourceUrl||null);}}).catch(error=>{console.warn("[ULAK haber detay] Kaynak özeti alınamadı:",error);}).finally(()=>{if(active)setSummaryLoading(false);}); return()=>{active=false;}; },[article?.link]);
 return <main style={{minHeight:"100vh",color:"#29231d"}}>
  <header style={{borderBottom:"1px solid #d8d0c4",background:"#fbf8f1"}}><div className="container" style={{paddingTop:18,paddingBottom:16}}><Link href="/" aria-label="ULAK’TAN HABERLER ana sayfa"><img src="/ulaktan-haberler-logo.svg" alt="ULAK’TAN HABERLER" style={{display:"block",width:"min(100%,360px)",height:"auto",margin:"0 auto"}} /></Link></div></header>
  <article className="container" style={{maxWidth:860,paddingTop:28,paddingBottom:64}}>
   <Link href="/" style={{display:"inline-block",marginBottom:26,color:"#985d32",fontWeight:700,fontSize:14}}>← Ana sayfaya dön</Link>
   {!bulletin&&!failed?<p className="muted">Haber yükleniyor...</p>:null}
   {failed?<section style={{padding:24,border:"1px solid #d8d0c4",borderRadius:10,background:"#fffdf8"}}><h1 style={{fontFamily:"Georgia,serif"}}>Haber şu anda yüklenemiyor</h1><p className="muted">Lütfen biraz sonra yeniden deneyin.</p></section>:null}
   {bulletin&&!article?<section style={{padding:24,border:"1px solid #d8d0c4",borderRadius:10,background:"#fffdf8"}}><h1 style={{fontFamily:"Georgia,serif"}}>Bu haber güncel bültende bulunamadı</h1><p className="muted">Haber listesi yenilenmiş olabilir. Güncel haberleri ana sayfadan inceleyebilirsiniz.</p><Link href="/" style={{color:"#985d32",fontWeight:700}}>Güncel haberlere git →</Link></section>:null}
   {article?<>
    <div style={{color:"#986033",fontSize:12,letterSpacing:1.5,fontWeight:800,textTransform:"uppercase"}}>{categories[article.sourceId]||"Gündem"}</div>
    <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(30px,5vw,46px)",lineHeight:1.16,margin:"12px 0 16px",letterSpacing:-0.7}}>{article.title}</h1>
    <div style={{color:"#82796e",fontSize:13,marginBottom:24}}>{article.sourceName}{dateLabel(article.publishedAt)?" · "+dateLabel(article.publishedAt):""}</div>
    {article.imageUrl?<img src={"/api/news-image?url="+encodeURIComponent(article.imageUrl)} alt={article.imageTitle||article.title} referrerPolicy="no-referrer" onError={event=>{const image=event.currentTarget;if(article.fallbackImageUrl&&image.dataset.fallback!=="used"){image.dataset.fallback="used";image.src="/api/news-image?url="+encodeURIComponent(article.fallbackImageUrl);image.alt=article.fallbackImageTitle||article.title;}else image.style.display="none";}} style={{display:"block",width:"100%",maxHeight:480,objectFit:"cover",borderRadius:10,background:"#eee7dc",marginBottom:28}}/>:null}
    <section style={{padding:"24px clamp(18px,4vw,34px)",border:"1px solid #ded5c9",borderRadius:10,background:"#fffdf8"}}>
     <div style={{color:"#986033",fontSize:11,letterSpacing:1.5,fontWeight:800,textTransform:"uppercase"}}>{detailedSummary?"Kaynak haber okunarak hazırlandı":"Haberin ayrıntıları"}</div>
     {summaryLoading?<p style={{margin:"10px 0 0",color:"#82796e",fontSize:14}}>Kaynak haber inceleniyor, ULAK’ın ayrıntılı özeti hazırlanıyor…</p>:null}
     <p style={{fontFamily:"Georgia,serif",fontSize:20,lineHeight:1.8,margin:"10px 0 0",whiteSpace:"pre-line"}}>{detailedSummary||article.editorialSummary||usefulSourceSummary||narration||"Bu haber için henüz ayrıntılı içerik bulunmuyor."}</p>
     {!detailedSummary&&usefulSourceSummary&&article.editorialSummary&&usefulSourceSummary!==article.editorialSummary?<p style={{fontSize:16,lineHeight:1.8,margin:"16px 0 0",whiteSpace:"pre-line"}}>{usefulSourceSummary}</p>:null}
     {!detailedSummary&&narration&&narration!==article.editorialSummary&&narration!==usefulSourceSummary?<p style={{fontSize:16,lineHeight:1.8,margin:"16px 0 0",whiteSpace:"pre-line"}}>{narration}</p>:null}
     {detailedSummary?<p style={{margin:"18px 0 0",fontSize:12,color:"#82796e"}}>ULAK editoryal özeti, kaynak haberin erişilebilen içeriği okunarak özgün biçimde hazırlanmıştır.</p>:null}
     {article.whyImportant?<div style={{marginTop:24,padding:18,background:"#f5efe5",borderLeft:"3px solid #bd8958",borderRadius:"0 8px 8px 0"}}><strong style={{fontSize:13}}>Neden önemli?</strong><p style={{margin:"7px 0 0",lineHeight:1.7}}>{article.whyImportant}</p></div>:null}
    </section>
    <section style={{marginTop:26,padding:20,borderTop:"1px solid #d8d0c4",borderBottom:"1px solid #d8d0c4"}}>
     <div style={{fontSize:11,color:"#986033",fontWeight:800,letterSpacing:1.5,marginBottom:8}}>HABER KAYNAĞI</div>
     <p style={{margin:"0 0 14px",color:"#756d63",lineHeight:1.6}}>Bu sayfadaki metin, kaynak haberin erişilebilen içeriği okunarak ULAK tarafından özgün cümlelerle hazırlanmış ayrıntılı bir özettir. Kaynağın özgün metni için yayıncıyı ziyaret edebilirsiniz. {summaryLoading ? "Kaynak metin inceleniyor." : ""}</p>
     <a href={resolvedSourceUrl||article.link} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",padding:"12px 18px",borderRadius:7,background:"#29231d",color:"#fff9ef",fontWeight:700,fontSize:14}}>{article.sourceName} kaynağında haberin tamamı ↗</a>
    </section>
    <div style={{marginTop:24,textAlign:"center",color:"#8a8176",fontSize:12}}>ULAK’TAN HABERLER · Türkiye’den ve dünyadan</div>
   </>:null}
  </article>
 </main>;
}
