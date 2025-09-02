#!/usr/bin/env node

/**
 * Documentation Monitoring Alerts and Recommendations System
 * Part of the comprehensive documentation monitoring system
 */

import fs from 'fs/promises';
import path from 'path';

export class DocumentationAlertsSystem {
  constructor(kpis, config) {
    this.kpis = kpis;
    this.config = config;
    this.alerts = [];
    this.recommendations = [];
  }

  /**
   * Generate alerts based on thresholds
   */
  async generateAlerts() {
    console.log('🚨 Generating alerts...');
    
    const alerts = [];
    
    // Check completeness threshold
    if (this.kpis.documentationHealth.completeness < 90) {
      alerts.push({
        level: 'warning',
        type: 'completeness',
        message: `Documentation completeness is ${this.kpis.documentationHealth.completeness}%, below 90% threshold`,
        metric: this.kpis.documentationHealth.completeness,
        threshold: 90
      });
    }
    
    // Check link health threshold
    if (this.kpis.linkHealth.healthScore < this.config.thresholds.linkHealthScore) {
      alerts.push({
        level: 'error',
        type: 'link_health',
        message: `Link health score is ${this.kpis.linkHealth.healthScore}%, below ${this.config.thresholds.linkHealthScore}% threshold`,
        metric: this.kpis.linkHealth.healthScore,
        threshold: this.config.thresholds.linkHealthScore,
        details: `${this.kpis.linkHealth.brokenLinks} broken links out of ${this.kpis.linkHealth.totalLinks}`
      });
    }
    
    // Check bilingual parity threshold
    if (this.kpis.bilingualParity.parityScore < this.config.thresholds.bilingualCoverage) {
      alerts.push({
        level: 'warning',
        type: 'bilingual_parity',
        message: `Bilingual parity is ${this.kpis.bilingualParity.parityScore}%, below ${this.config.thresholds.bilingualCoverage}% threshold`,
        metric: this.kpis.bilingualParity.parityScore,
        threshold: this.config.thresholds.bilingualCoverage
      });
    }
    
    // Check review backlog
    if (this.kpis.reviewBacklog.overdueReviews > 0) {
      alerts.push({
        level: 'warning',
        type: 'review_backlog',
        message: `${this.kpis.reviewBacklog.overdueReviews} reviews are overdue (>${this.config.thresholds.reviewBacklogDays} days)`,
        metric: this.kpis.reviewBacklog.overdueReviews,
        threshold: 0
      });
    }
    
    // Check document age
    if (this.kpis.versionFreshness.averageAge > this.config.thresholds.documentFreshness) {
      alerts.push({
        level: 'info',
        type: 'document_age',
        message: `Average document age is ${this.kpis.versionFreshness.averageAge} days, above ${this.config.thresholds.documentFreshness} day threshold`,
        metric: this.kpis.versionFreshness.averageAge,
        threshold: this.config.thresholds.documentFreshness
      });
    }
    
    // Check content coverage
    if (this.kpis.contentCoverage.coverageScore < this.config.thresholds.contentCoverage) {
      alerts.push({
        level: 'warning',
        type: 'content_coverage',
        message: `Content coverage is ${this.kpis.contentCoverage.coverageScore}%, below ${this.config.thresholds.contentCoverage}% threshold`,
        metric: this.kpis.contentCoverage.coverageScore,
        threshold: this.config.thresholds.contentCoverage
      });
    }
    
    this.alerts = alerts;
    
    console.log(`  🚨 Generated ${alerts.length} alerts`);
    alerts.forEach(alert => {
      const emoji = alert.level === 'error' ? '🔴' : alert.level === 'warning' ? '🟡' : '🔵';
      console.log(`    ${emoji} ${alert.type}: ${alert.message}`);
    });

    return alerts;
  }

  /**
   * Generate recommendations for improvement
   */
  async generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    const recommendations = [];
    
    // Completeness recommendations
    if (this.kpis.documentationHealth.completeness < 90) {
      const missingDocs = Math.round((90 - this.kpis.documentationHealth.completeness) / 100 * 
        (this.kpis.contentCoverage.totalModules * this.config.requiredDocTypes.length));
      
      recommendations.push({
        priority: 'high',
        category: 'completeness',
        action: `Create ${missingDocs} missing documentation files`,
        impact: 'Improves overall documentation completeness',
        effort: 'medium'
      });
    }
    
    // Link health recommendations
    if (this.kpis.linkHealth.brokenLinks > 0) {
      recommendations.push({
        priority: 'high',
        category: 'link_health',
        action: `Fix ${this.kpis.linkHealth.brokenLinks} broken links`,
        impact: 'Improves user experience and navigation',
        effort: 'low'
      });
    }
    
    // Bilingual parity recommendations
    if (this.kpis.bilingualParity.parityScore < 80) {
      const missingTranslations = this.kpis.bilingualParity.totalContent - this.kpis.bilingualParity.bilingualContent;
      
      recommendations.push({
        priority: 'medium',
        category: 'bilingual_parity',
        action: `Create ${missingTranslations} missing translations`,
        impact: 'Improves accessibility for Spanish-speaking users',
  m;tsSysteionAlerntatt Documexport defaul}

e  });
  }
y];
  .priorityOrder[briorit] - pa.prioritytyOrder[riorireturn p };
      m: 2, low: 3 mediuigh: 1,, hcritical: 0 { r =orityOrdest pri      con) => {
.sort((a, bnsiorn act retu       });



      }   });ort
     .effeffort: rec         ct,
 rec.impaact:      impory,
     eg rec.catry:      catego    week
 , // 1ing()00).toISOStr * 60 * 10* 60 + 7 * 24 .now() Date(DateDate: new     due,
     ionn: rec.act  actio',
        ority: 'high    pri     {
 h(.pusctions   a     {
 === 'high')ty riec.prio    if (r {
  =>ach(rec tions.forEommendas.rec  thidations
  recommenpriority  // High      });

  }
          });
 on'
   olutialert_resry: '    catego       3 days
ring(), //0).toISOSt0 * 100* 60 * 6+ 3 * 24 ) .now(Dateate(ate: new D   dueD    ge}`,
   rt.messaype}: ${alert.tress ${ale: `Addction   a     cal',
  rity: 'criti       priopush({
   ns.tio       acor') {
  'err== =alert.level     if ({
 t => er.forEach(al.alerts   thislerts
 tions from al acCritica
    // ;
ns = []st actio    conctions() {
MaintenanceAerate gen/
 
   *tionsnance acfic mainte speciGenerate
   * **
  /;
  }
eturn report    r2));
    
 null, t,reporringify(N.stJSOson', -report.jaintenance/mocs('diles.writeF   await fort
 nce repave maintena
    // S    };
ons()
ActiancetenteMain this.generaanceActions:en     maintations,
 endomm this.recns:endatio    recommlerts,
   this.a   alerts:   },
   ngth
   h').le= 'higiority ==r.prfilter(r => endations.ommis.recndations: thommeRechPriorityhigh,
        engttions.lmmenda: this.reconstiodammen   totalReco   .length,
   'info')a.level === => filter(aerts..alAlerts: thisfo  in  ,
    .lengthning')l === 'wara => a.leveter(lerts.filerts: this.awarningAl       gth,
 en').l== 'error> a.level =er(a =rts.filtthis.alealAlerts:     critic,
    ngths.les.alertlAlerts: thi    totay: {
      summar
    ),toISOString(ew Date(). n timestamp:
     = {st report  con
    {eReport()ancnten generateMai
  asyncus
   */tattenance sinon maumentatir docing foeportomated renerate aut  * G

  /**
 ;
  }nsatiorecommendurn ;

    ret
    })`);on}cti: ${rec.ary}ec.catego${emoji} ${r    .log(`  console  : '🟢';
  ' ? '🟡'  'medium ===ec.priority'🔴' : r 'high' ? ity === rec.prioroji =nst em
      coc => {Each(reions.fordaten recomms`);
   commendations.length} reendationd ${recomm  💡 Generate.log(`   console
    
 ;tions recommenda =ommendations    this.rec 
    }
     });
w'
    fort: 'lo     efs',
   oolor AI tmentation fgration docuter intepact: 'Bet
        imoverage',ion cntatols documee MCP to'Improv  action: ',
      cumentationcp_do 'mgory:  cate',
      owy: 'l   prioritush({
     tions.pcommenda     re< 60) {
 overage pCtCoverage.mcis.contenhis.kp 
    if (t}
   });
        dium'
   effort: 'me       lopers',
vetion for dedocumentatter API  'Bet:mpac   iage',
     ion covermentatocupenAPI dve OImpro 'action:     tion',
   cumentay: 'api_doategor   c
     dium',iority: 'me  pr   ({
   ions.pushat  recommend   70) {
 overage < penApiCverage.ois.contentCo (this.kpns
    ifmendatioerage recomP covpenAPI/MC   // O
     }
     });
  medium'
   rt: '       effoquality',
 t es conteng and improvew backloevies rducRe   impact: '    uments`,
 ng docews} pendiviingReacklog.pendviewBs.rehis.kpiview ${tn: `Re actios',
       _procesy: 'reviewategor   cm',
     diuority: 'meri     ppush({
   ions. recommendat     5) {
 Reviews >endingklog.pewBacis.revi (this.kp  if
  tionsrecommendag acklo// Review b   
    }
        });
 '
  'highort:       eff