/**
 * T9 Pinyin Utility
 * Maps numeric sequences to possible pinyin combinations for T9 keyboard input
 * 
 * Reference: T9PinYinUtils.kt from [gurecn/yuyansdk](https://github.com/gurecn/yuyansdk/blob/master/src/main/java/com/yuyan/inputmethod/util/T9PinYinUtils.kt)
 */

/**
 * Check if a string is a valid T9 numeric sequence
 * @param sequence - String to check
 * @returns true if valid T9 sequence
 */
export function isValidT9Sequence (sequence: string): boolean {
  return /^[2-9]+$/.test(sequence)
}

class T9PinYinUtils {
  private static readonly t9KeyMap: Record<string, string> = {
    'a': 'A',
    'b': 'A',
    'c': 'A',
    'd': 'D',
    'e': 'D',
    'f': 'D',
    'g': 'G',
    'h': 'G',
    'i': 'G',
    'j': 'J',
    'k': 'J',
    'l': 'J',
    'm': 'M',
    'n': 'M',
    'o': 'M',
    'p': 'P',
    'q': 'P',
    'r': 'P',
    's': 'P',
    't': 'T',
    'u': 'T',
    'v': 'T',
    'w': 'W',
    'x': 'W',
    'y': 'W',
    'z': 'W',
  };

  private static readonly t9NumKeyMap: Record<string, string> = {
    '2': 'A',
    '3': 'D',
    '4': 'G',
    '5': 'J',
    '6': 'M',
    '7': 'P',
    '8': 'T',
    '9': 'W'
  };

  private static readonly pinyinMap: Record<string, string> = {
    "A": "a,b,c",
    "D": "e,d,f",
    "G": "g,h,i",
    "J": "j,k,l",
    "M": "o,m,n",
    "P": "p,q,r,s",
    "T": "t,u,v",
    "W": "w,x,y,z",
    "AA": "ba,ca",
    "AD": "ce",
    "AG": "ai,bi,ci,ch",
    "AM": "an,ao,bo",
    "AT": "bu,cu",
    "DA": "da,fa",
    "DD": "de",
    "DG": "di,ei",
    "DM": "en,fo",
    "DP": "er",
    "DT": "du,fu",
    "GA": "ga,ha",
    "GD": "ge,he",
    "GT": "gu,hu",
    "JA": "ka,la",
    "JD": "ke,le",
    "JG": "ji,li",
    "JM": "lo",
    "JT": "ju,ku,lu,lv",
    "MA": "ma,na",
    "MD": "me,ne",
    "MG": "mi,ni",
    "MM": "mo",
    "MT": "mu,nu,nv,ou",
    "PA": "pa,sa",
    "PD": "re,se",
    "PG": "pi,qi,ri,si,sh",
    "PM": "po",
    "PT": "pu,qu,ru,su",
    "TA": "ta",
    "TD": "te",
    "TG": "ti",
    "TT": "tu",
    "WA": "wa,ya,za",
    "WD": "ye,ze",
    "WG": "xi,yi,zi",
    "WM": "wo,yo",
    "WT": "wu,xu,yu,zu",
    "AAG": "bai,cai",
    "AAM": "ban,bao,can,cao",
    "ADG": "bei",
    "ADM": "ben,cen",
    "AGA": "cha",
    "AGD": "bie,che",
    "AGG": "chi",
    "AGM": "bin",
    "AGT": "chu",
    "AMG": "ang",
    "AMT": "cou",
    "ATG": "cui",
    "ATM": "cun,cuo",
    "DAG": "dai",
    "DAM": "dan,dao,fan",
    "DDG": "dei,fei",
    "DDM": "den,fen",
    "DGA": "dia",
    "DGD": "die",
    "DGT": "diu",
    "DMG": "eng",
    "DMT": "dou,fou",
    "DTG": "dui",
    "DTM": "dun,duo",
    "GAG": "gai,hai",
    "GAM": "gan,gao,han,hao",
    "GDG": "gei,hei",
    "GDM": "gen,hen",
    "GMT": "gou,hou",
    "GTA": "gua,hua",
    "GTG": "gui,hui",
    "GTM": "gun,guo,hun,huo",
    "JAG": "kai,lai",
    "JAM": "kan,kao,lan,lao",
    "JDG": "kei,lei",
    "JDM": "ken",
    "JGA": "jia,lia",
    "JGD": "jie,lie",
    "JGM": "jin,lin",
    "JGT": "jiu,liu",
    "JMT": "kou,lou",
    "JTA": "kua",
    "JTD": "jue,lue",
    "JTG": "kui",
    "JTM": "jun,kun,kuo,lun,luo",
    "MAG": "mai,nai",
    "MAM": "man,mao,nan,nao",
    "MDG": "mei,nei",
    "MDM": "men,nen",
    "MGD": "mie,nie",
    "MGM": "min,nin",
    "MGT": "miu,niu",
    "MMT": "mou,nou",
    "MTD": "nue",
    "MTM": "nuo",
    "PAG": "pai,sai",
    "PAM": "pan,pao,ran,rao,san,sao",
    "PDG": "pei",
    "PDM": "pen,ren,sen",
    "PGA": "qia,sha",
    "PGD": "pie,qie,she",
    "PGG": "shi",
    "PGM": "pin,qin",
    "PGT": "qiu,shu",
    "PMT": "pou,rou,sou",
    "PTD": "que",
    "PTG": "rui,sui",
    "PTM": "qun,run,ruo,sun,suo",
    "TAG": "tai",
    "TAM": "tan,tao",
    "TDG": "tei",
    "TGD": "tie",
    "TMT": "tou",
    "TTG": "tui",
    "TTM": "tun,tuo",
    "WAG": "wai,zai",
    "WAM": "wan,yan,yao,zan,zao",
    "WDG": "wei,zei",
    "WDM": "wen,zen",
    "WGA": "xia,zha",
    "WGD": "xie,zhe",
    "WGG": "zhi",
    "WGM": "xin,yin",
    "WGT": "xiu,zhu",
    "WMT": "you,zou",
    "WTD": "xue,yue",
    "WTG": "zui",
    "WTM": "xun,yun,zun,zuo",
    "AAMG": "bang,cang",
    "ADMG": "beng,ceng",
    "AGAG": "chai",
    "AGAM": "bian,biao,chan,chao",
    "AGDM": "chen",
    "AGMG": "bing",
    "AGMT": "chou",
    "AGTA": "chua",
    "AGTG": "chui",
    "AGTM": "chun,chuo",
    "AMMG": "cong",
    "ATAM": "cuan",
    "DAMG": "dang,fang",
    "DDMG": "deng,feng",
    "DGAM": "dian,diao,fiao",
    "DGMG": "ding",
    "DMMG": "dong",
    "DTAM": "duan",
    "GAMG": "gang,hang",
    "GDMG": "geng,heng",
    "GMMG": "gong,hong",
    "GTAG": "guai,huai",
    "GTAM": "guan,huan",
    "JAMG": "kang,lang",
    "JDMG": "keng,leng",
    "JGAM": "jian,jiao,lian,liao",
    "JGMG": "jing,ling",
    "JMMG": "kong,long",
    "JTAG": "kuai",
    "JTAM": "juan,kuan,luan",
    "MAMG": "mang,nang",
    "MDMG": "meng,neng",
    "MGAM": "mian,miao,nian,niao",
    "MGMG": "ming,ning",
    "MMMG": "nong",
    "MTAM": "nuan",
    "PAMG": "pang,rang,sang",
    "PDMG": "peng,reng,seng",
    "PGAG": "shai",
    "PGAM": "pian,piao,qian,qiao,shan,shao",
    "PGDG": "shei",
    "PGDM": "shen",
    "PGMG": "ping,qing",
    "PGMT": "shou",
    "PGTA": "shua",
    "PGTG": "shui",
    "PGTM": "shun,shuo",
    "PMMG": "rong,song",
    "PTAM": "quan,ruan,suan",
    "TAMG": "tang",
    "TDMG": "teng",
    "TGAM": "tian,tiao",
    "TGMG": "ting",
    "TMMG": "tong",
    "TTAM": "tuan",
    "WAMG": "wang,yang,zang",
    "WDMG": "weng,zeng",
    "WGAG": "zhai",
    "WGAM": "xian,xiao,zhan,zhao",
    "WGDG": "zhei",
    "WGDM": "zhen",
    "WGMG": "xing,ying",
    "WGMT": "zhou",
    "WGTA": "zhua",
    "WGTG": "zhui",
    "WGTM": "zhun,zhuo",
    "WMMG": "yong,zong",
    "WTAM": "xuan,yuan,zuan",
    "AGAMG": "chang,biang",
    "AGDMG": "cheng",
    "AGMMG": "chong",
    "AGTAG": "chuai",
    "AGTAM": "chuan",
    "GTAMG": "guang,huang",
    "JGAMG": "jiang,liang",
    "JGMMG": "jiong",
    "JTAMG": "kuang",
    "MGAMG": "niang",
    "PGAMG": "qiang,shang",
    "PGDMG": "sheng",
    "PGMMG": "qiong",
    "PGTAG": "shuai",
    "PGTAM": "shuan",
    "WGAMG": "xiang,zhang",
    "WGDMG": "zheng",
    "WGMMG": "xiong,zhong",
    "WGTAG": "zhuai",
    "WGTAM": "zhuan",
    "AGTAMG": "chuang",
    "PGTAMG": "shuang",
    "WGTAMG": "zhuang"
  };

  /**
   * 获取T9键码对应的拼音组合
   */
  static t9KeyToPinyin(t9Sequence?: string | null): string[] {
    if (!t9Sequence || t9Sequence.length === 0) {
      return [];
    }
    
    const t9NumString = t9Sequence.length > 6 
      ? t9Sequence.substring(0, 6) 
      : t9Sequence;
    
    const pinyin: string[] = [];
    
    for (let length = t9NumString.length; length >= 1; length--) {
      const prefix = t9NumString.substring(0, length);
      const value = this.pinyinMap[prefix];
      if (value) {
        pinyin.push(...value.split(','));
      }
    }
    
    return pinyin;
  }

  /**
   * 获取拼音对应的键码
   */
  static pinyin2Key(sequence?: string | null): string {
    if (!sequence || sequence.length === 0) return '';
    
    for (const [key, value] of Object.entries(this.pinyinMap)) {
      const pinyinList = value.split(',');
      if (pinyinList.some(item => item === sequence)) {
        return key;
      }
    }
    
    return '';
  }

  static pinyin2T9Key(pinyin: string): string {
    return this.t9KeyMap[pinyin] || pinyin;
  }

  static NumKeyChar2T9Key(char: string): string {
  return T9PinYinUtils.t9NumKeyMap[char] || char;
  }

  static NumKey2T9Key(keySequence: string): string {
    return keySequence.split('').map(char => T9PinYinUtils.NumKeyChar2T9Key(char)).join("")
  }

  static getT9Composition(composition: string, comment: string): string {
    if (comment.length === 0) return composition;
    
    const compositionList = composition
      .split('')
      .filter(char => char.charCodeAt(0) <= 0xFF)
      .join('')
      .split("'");
    
    let result = composition
      .split('')
      .filter(char => char.charCodeAt(0) > 0xFF)
      .join('');
    
    const commentParts = comment.split("'");
    
    commentParts.forEach((pinyin, index) => {
      if (index < compositionList.length) {
        const compo = compositionList[index];
        result += compo.length >= pinyin.length 
          ? pinyin 
          : pinyin.substring(0, compo.length);
        result += "'";
      }
    });
    
    return result;
  }
}

export default T9PinYinUtils;