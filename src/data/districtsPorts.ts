import type { DistrictEntry, PortEntry } from "../types.js";

/**
 * Census Bureau Schedule D district and port codes, as used for the DISTRICT parameter (hs,
 * naics, enduse, sitc, usda, hitech datasets) and PORT parameter (porths dataset) across the
 * International Trade Data API.
 *
 * Source: Foreign Trade Division "Schedule D - District/Port List"
 * (https://www.census.gov/foreign-trade/schedules/d/dist.txt), "Produced APRIL25".
 *
 * Cross-checked against live trade data for December 2025, via:
 *   exports/hs?get=DISTRICT,DIST_NAME,ALL_VAL_MO&time=2025-12&SUMMARY_LVL2=DT
 *   imports/hs?get=DISTRICT,DIST_NAME,GEN_VAL_MO&time=2025-12&SUMMARY_LVL2=DT
 *   exports/porths?get=PORT,PORT_NAME,ALL_VAL_MO&time=2025-12&SUMMARY_LVL2=PT
 *   imports/porths?get=PORT,PORT_NAME,GEN_VAL_MO&time=2025-12&SUMMARY_LVL2=PT
 *
 * Findings from that comparison:
 * - All 46 districts in Schedule D showed trade in Dec 2025 (no districts missing either way).
 *   6 districts have minor name differences between Schedule D and the live API (e.g. Schedule D's
 *   "DALLAS/FT. WORTH, TX" vs the API's "DALLAS-FORT WORTH, TX", or "LOW-VALUED IMPORTS AND EXPORTS"
 *   vs "LOW VALUE"). The live API name is used below since it reflects current Census usage.
 * - Ports: Schedule D lists 430 ports. Live Dec-2025 trade additionally included 10 port codes NOT
 *   in Schedule D (e.g. 1105 Paulsboro NJ, 2707 Port San Luis CA, 7070/7010 - alternate codes for
 *   "LOW VALUE"/"CANADIAN LATE RECEIPTS ESTIMATE" alongside Schedule D's own 7000/7001) - these are
 *   included below, flagged inline, for a total of 440 ports. One of those (1791) traded $78.8M in
 *   Dec-2025 imports but the Census API returned no PORT_NAME for it at all.
 * - 81 ports have minor name-formatting differences between Schedule D and the live API (mostly
 *   abbreviation expansion, e.g. "INTL" -> "INTERNATIONAL", or punctuation/spacing). The live API
 *   name is used below for the same reason as districts. A handful of Schedule D's own names also
 *   contained apparent typos (e.g. "SCOBY, MT" vs the airport's actual name "SCOBEY, MT") which the
 *   live API name corrects.
 * - Two port names are reproduced verbatim from the Census API despite visible data-quality issues
 *   in Census's own source (see inline comments on codes 3910 and 3983) - not corrected/guessed here.
 * - 37 Schedule D ports had no trade in December 2025; they are retained as-is (a single inactive
 *   month doesn't mean a port code is invalid).
 *
 * PORTS was further cross-checked against a second, broader CBP source: "ACE M1 Import Manifest
 * Electronic Data Interchange, Appendix E - Schedule D - U.S. CBP Port Codes" (February 3, 2026)
 * (https://www.cbp.gov/sites/default/files/2026-02/ace_appendix_e_schedule_d_feb_3_2026_508c_0.pdf).
 * That document lists 522 four-character codes - more than Census's own Schedule D - because it's
 * CBP's full ACE manifest-processing reference, not the narrower Foreign Trade Statistics port list.
 * 107 codes present in that PDF were missing from PORTS below and have been added (flagged inline
 * "from CBP ACE Appendix E"), per instruction to add missing ports without removing any existing ones
 * (some ports below may be historically-traded but since delisted from current CBP/Census references).
 * Of those 107:
 * - 65 are real U.S. ports whose code prefix matches one of the 46 districts above (e.g. 0781
 *   Plattsburgh Intl Airport, NY; 1820 Port St. Joe, FL; 2482 Roswell Industrial Airport, NM).
 * - 42 are CBP-administrative codes with NO matching Census district - region aggregates (e.g. 7600
 *   "Southwest Region, Houston, TX"), foreign CBP preclearance stations (e.g. 7121 Montreal, 7543 Abu
 *   Dhabi, 7541/7542 Dublin/Shannon), Guam-area codes (3207/3211-3213), and a Newark/JFK-area 46xx/47xx
 *   numbering block that doesn't overlap Census's district numbering at all. Per explicit instruction,
 *   these were still added, with districtCode set mechanically to the code's own leading 2 digits even
 *   though no such Census district exists (flagged inline "no matching Census district for prefix").
 *   Treat entries with that flag as CBP manifest/administrative codes, not Census trade-statistics ports.
 *
 * PORTS was further checked against Census's own live trade history, via porths queries for every
 * year 2009-2024 (2009 correctly returned HTTP 204 - the dataset starts January 2010):
 *   exports/porths?get=PORT,PORT_NAME&time=from+YYYY-01+to+YYYY-12&SUMMARY_LVL2=PT
 *   imports/porths?get=PORT,PORT_NAME&time=from+YYYY-01+to+YYYY-12&SUMMARY_LVL2=PT
 * That 16-year sweep saw 458 unique ports trade at least once; 42 of those were missing from PORTS
 * (i.e. not in Census's April-2025 Schedule D, the Dec-2025 live check, or CBP's Feb-2026 Appendix E)
 * and have been added below, flagged inline "historical - traded <year range>" with the actual year
 * span observed (e.g. 4117 Huron, OH traded every year 2010-2024 yet still isn't in any current
 * reference list). 6 of the 42 never had a PORT_NAME published by Census in any of the 16 years
 * checked. Those 6 codes are denoted "(former)" and were manually reconciled later. All 42 have a code
 * prefix matching a real district (unlike the CBP-administrative codes above), since these came
 * directly from Census's own trade-statistics data rather than the broader CBP manifest reference.
 */

/** U.S. Customs districts (46 total). */
export const DISTRICTS: DistrictEntry[] = [
  { code: "01", name: "PORTLAND, ME" },
  { code: "02", name: "ST. ALBANS, VT" },
  { code: "04", name: "BOSTON, MA" },
  { code: "05", name: "PROVIDENCE, RI" },
  { code: "07", name: "OGDENSBURG, NY" },
  { code: "09", name: "BUFFALO, NY" },
  { code: "10", name: "NEW YORK CITY, NY" },
  { code: "11", name: "PHILADELPHIA, PA" },
  { code: "13", name: "BALTIMORE, MD" },
  { code: "14", name: "NORFOLK, VA" },
  { code: "15", name: "WILMINGTON, NC" },
  { code: "16", name: "CHARLESTON, SC" },
  { code: "17", name: "SAVANNAH, GA" },
  { code: "18", name: "TAMPA, FL" },
  { code: "19", name: "MOBILE, AL" },
  { code: "20", name: "NEW ORLEANS, LA" },
  { code: "21", name: "PORT ARTHUR, TX" },
  { code: "23", name: "LAREDO, TX" },
  { code: "24", name: "EL PASO, TX" },
  { code: "25", name: "SAN DIEGO, CA" },
  { code: "26", name: "NOGALES, AZ" },
  { code: "27", name: "LOS ANGELES, CA" },
  { code: "28", name: "SAN FRANCISCO, CA" },
  { code: "29", name: "COLUMBIA-SNAKE, OR" },
  { code: "30", name: "SEATTLE, WA" },
  { code: "31", name: "ANCHORAGE, AK" },
  { code: "32", name: "HONOLULU, HI" },
  { code: "33", name: "GREAT FALLS, MT" },
  { code: "34", name: "PEMBINA, ND" },
  { code: "35", name: "MINNEAPOLIS, MN" },
  { code: "36", name: "DULUTH, MN" },
  { code: "37", name: "MILWAUKEE, WI" },
  { code: "38", name: "DETROIT, MI" },
  { code: "39", name: "CHICAGO, IL" },
  { code: "41", name: "CLEVELAND, OH" },
  { code: "45", name: "ST. LOUIS, MO" },
  { code: "49", name: "SAN JUAN, PR" },
  { code: "51", name: "U.S. VIRGIN ISLANDS" },
  { code: "52", name: "MIAMI, FL" },
  { code: "53", name: "HOUSTON-GALVESTON, TX" },
  { code: "54", name: "WASHINGTON, DC" },
  { code: "55", name: "DALLAS-FORT WORTH, TX" },
  { code: "59", name: "NORFOLK/MOBILE/CHARLESTON" },
  { code: "60", name: "VESSELS UNDER OWN POWER" },
  { code: "70", name: "LOW VALUE" },
  { code: "80", name: "MAIL SHIPMENTS" },
];

/** U.S. Customs ports (440 total: 430 from Schedule D plus 10 observed only in live trade data). */
export const PORTS: PortEntry[] = [
  { code: "0101", name: "PORTLAND, ME", districtCode: "01" },
  { code: "0102", name: "BANGOR, ME", districtCode: "01" },
  { code: "0103", name: "EASTPORT, ME", districtCode: "01" },
  { code: "0104", name: "JACKMAN, ME", districtCode: "01" },
  { code: "0105", name: "VANCEBORO, ME", districtCode: "01" },
  { code: "0106", name: "HOULTON, ME", districtCode: "01" },
  { code: "0107", name: "FORT FAIRFIELD, ME", districtCode: "01" },
  { code: "0108", name: "VAN BUREN, ME", districtCode: "01" },
  { code: "0109", name: "MADAWASKA, ME", districtCode: "01" },
  { code: "0110", name: "FORT KENT, ME", districtCode: "01" },
  { code: "0111", name: "BATH, ME", districtCode: "01" },
  { code: "0112", name: "BAR HARBOR, ME", districtCode: "01" },
  { code: "0115", name: "CALAIS, ME", districtCode: "01" },
  { code: "0118", name: "LIMESTONE, ME", districtCode: "01" },
  { code: "0121", name: "ROCKLAND, ME", districtCode: "01" },
  { code: "0122", name: "JONESPORT, ME", districtCode: "01" },
  { code: "0127", name: "BRIDGEWATER, ME", districtCode: "01" },
  { code: "0131", name: "PORTSMOUTH, NH", districtCode: "01" },
  { code: "0132", name: "BELFAST, ME", districtCode: "01" }, // historical - traded 2010-2019, not in current CBP/Census references (likely delisted)
  { code: "0152", name: "SEARSPORT, ME", districtCode: "01" },
  { code: "0181", name: "LEBANON MUNICIPAL AIRPORT, NH", districtCode: "01" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "0182", name: "MANCHESTER USER FEE AIRPORT, NH", districtCode: "01" },
  { code: "0201", name: "ST. ALBANS, VT", districtCode: "02" },
  { code: "0203", name: "RICHFORD, VT", districtCode: "02" },
  { code: "0206", name: "BEECHER FALLS, VT", districtCode: "02" },
  { code: "0207", name: "BURLINGTON, VT", districtCode: "02" },
  { code: "0209", name: "DERBY LINE, VT", districtCode: "02" },
  { code: "0211", name: "NORTON, VT", districtCode: "02" },
  { code: "0212", name: "HIGHGATE SPRINGS-ALBURG, VT", districtCode: "02" },
  { code: "0221", name: "Northeast Region, Boston, Massachusetts", districtCode: "02" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "0401", name: "BOSTON, MA", districtCode: "04" },
  { code: "0402", name: "SPRINGFIELD, MA", districtCode: "04" },
  { code: "0403", name: "WORCESTER, MA", districtCode: "04" },
  { code: "0404", name: "GLOUCESTER, MA", districtCode: "04" },
  { code: "0405", name: "NEW BEDFORD, MA", districtCode: "04" },
  { code: "0406", name: "PLYMOUTH, MA", districtCode: "04" },
  { code: "0407", name: "FALL RIVER, MA", districtCode: "04" },
  { code: "0408", name: "SALEM, MA", districtCode: "04" },
  { code: "0409", name: "PROVINCETOWN, MA", districtCode: "04" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "0410", name: "BRIDGEPORT, CT", districtCode: "04" },
  { code: "0411", name: "HARTFORD, CT", districtCode: "04" },
  { code: "0412", name: "NEW HAVEN, CT", districtCode: "04" },
  { code: "0413", name: "NEW LONDON, CT", districtCode: "04" },
  { code: "0416", name: "LAWRENCE, MA", districtCode: "04" },
  { code: "0417", name: "LOGAN AIRPORT, MA", districtCode: "04" },
  { code: "0481", name: "L.G. HANSCOM FIELD, BEDFORD, MA", districtCode: "04" },
  { code: "0501", name: "NEWPORT, RI", districtCode: "05" },
  { code: "0502", name: "PROVIDENCE, RI", districtCode: "05" },
  { code: "0503", name: "MELLVILLE, RI", districtCode: "05" },
  { code: "0701", name: "OGDENSBURG, NY", districtCode: "07" },
  { code: "0704", name: "MASSENA, NY", districtCode: "07" },
  { code: "0706", name: "CAPE VINCENT, NY", districtCode: "07" },
  { code: "0708", name: "ALEXANDRIA BAY, NY", districtCode: "07" },
  { code: "0712", name: "CHAMPLAIN-ROUSES POINT, NY", districtCode: "07" },
  { code: "0714", name: "CLAYTON, NY", districtCode: "07" },
  { code: "0715", name: "TROUT RIVER, NY", districtCode: "07" },
  { code: "0781", name: "Plattsburgh International Airport, Plattsburgh, New York", districtCode: "07" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "0901", name: "BUFFALO-NIAGARA FALLS, NY", districtCode: "09" },
  { code: "0903", name: "ROCHESTER, NY", districtCode: "09" },
  { code: "0904", name: "OSWEGO, NY", districtCode: "09" },
  { code: "0905", name: "SODUS POINT, NY", districtCode: "09" },
  { code: "0906", name: "SYRACUSE, NY", districtCode: "09" },
  { code: "0907", name: "UTICA, NY", districtCode: "09" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "0921", name: "Northeast Region, Boston Massachusetts", districtCode: "09" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "0981", name: "BINGHAMTON REGIONAL AIRPORT, NY", districtCode: "09" },
  { code: "0982", name: "Griffiss International User Fee Airport, Rome, New York", districtCode: "09" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "0983", name: "ITHACA TOMPKINS INTL AIR, ITHACA, NY", districtCode: "09" },
  { code: "1001", name: "NEW YORK, NY", districtCode: "10" },
  { code: "1002", name: "ALBANY, NY", districtCode: "10" },
  { code: "1003", name: "NEWARK, NJ", districtCode: "10" },
  { code: "1004", name: "PERTH AMBOY, NJ", districtCode: "10" },
  { code: "1012", name: "JFK INTERNATIONAL AIRPORT, NY", districtCode: "10" },
  { code: "1068", name: "NEWARK FEDEX ECCF, NJ", districtCode: "10" },
  { code: "1069", name: "UPS, NEWARK, NJ", districtCode: "10" },
  { code: "1071", name: "NYACC, JAMAICA, NY", districtCode: "10" },
  { code: "1072", name: "DHL, JAMAICA, NY", districtCode: "10" },
  { code: "1073", name: "EMERY WORLDWIDE, JAMAICA, NY", districtCode: "10" },
  { code: "1074", name: "AIR FRANCE (MACH PLUS), JAMAICA, NY", districtCode: "10" },
  { code: "1078", name: "TNT SKYPAK, JAMAICA, NY", districtCode: "10" },
  { code: "1081", name: "MORRISTOWN AIRPORT, NEWARK, NJ", districtCode: "10" },
  { code: "1101", name: "PHILADELPHIA, PA", districtCode: "11" },
  { code: "1102", name: "CHESTER, PA", districtCode: "11" },
  { code: "1103", name: "WILMINGTON, DE", districtCode: "11" },
  { code: "1104", name: "PITTSBURGH, PA", districtCode: "11" },
  { code: "1105", name: "PAULSBORO, NJ", districtCode: "11" }, // not in Schedule D (APRIL25) - observed in live Dec-2025 trade data only
  { code: "1106", name: "WILKES-BARRE/SCRANTON, PA", districtCode: "11" },
  { code: "1107", name: "CAMDEN, NJ", districtCode: "11" }, // not in Schedule D (APRIL25) - observed in live Dec-2025 trade data only
  { code: "1108", name: "PHILADELPHIA INTERNATIONAL AIRPORT, PA", districtCode: "11" },
  { code: "1109", name: "HARRISBURG, PA", districtCode: "11" },
  { code: "1113", name: "GLOUCESTER CITY, NJ", districtCode: "11" },
  { code: "1119", name: "ALLENTOWN, PA", districtCode: "11" },
  { code: "1181", name: "ALLENTOWN-BETHLEHEM, PA", districtCode: "11" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "1182", name: "ATLANTIC CITY USER FEE AIRPORT, NJ", districtCode: "11" },
  { code: "1183", name: "TRENTON-MERCER COUNTY USER FEE AIRPORT, NJ", districtCode: "11" },
  { code: "1195", name: "UPS, PHILADELPHIA, PA", districtCode: "11" },
  { code: "1301", name: "ANNAPOLIS, MD", districtCode: "13" },
  { code: "1302", name: "CAMBRIDGE, MD", districtCode: "13" },
  { code: "1303", name: "BALTIMORE, MD", districtCode: "13" },
  { code: "1304", name: "CRISFIELD, MD", districtCode: "13" },
  { code: "1305", name: "BALTIMORE-WASHINGTON INTERNATIONAL AIRPORT, MD", districtCode: "13" },
  { code: "1401", name: "NORFOLK-NEWPORT NEWS, VA", districtCode: "14" },
  { code: "1402", name: "(former) Newport News, Virginia", districtCode: "14" }, // historical - traded 2010-2012, not in current CBP/Census references; no name ever published by Census
  { code: "1404", name: "RICHMOND-PETERSBURG, VA", districtCode: "14" },
  { code: "1408", name: "HOPEWELL, VA", districtCode: "14" }, // historical - traded 2010-2017, not in current CBP/Census references (likely delisted)
  { code: "1409", name: "CHARLESTON, WV", districtCode: "14" },
  { code: "1410", name: "FRONT ROYAL, VA", districtCode: "14" },
  { code: "1412", name: "NEW RIVER VALLEY AIRPORT, VA", districtCode: "14" },
  { code: "1501", name: "WILMINGTON, NC", districtCode: "15" },
  { code: "1502", name: "WINSTON-SALEM, NC", districtCode: "15" },
  { code: "1503", name: "DURHAM, NC", districtCode: "15" },
  { code: "1506", name: "(former) Reidsville, North Carolina", districtCode: "15" }, // historical - traded 2010, not in current CBP/Census references; no name ever published by Census
  { code: "1511", name: "BEAUFORT-MOREHEAD CITY, NC", districtCode: "15" },
  { code: "1512", name: "CHARLOTTE, NC", districtCode: "15" },
  { code: "1581", name: "Charlotte-Monroe User Fee Airport, Monroe, North Carolina", districtCode: "15" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "1601", name: "CHARLESTON, SC", districtCode: "16" },
  { code: "1602", name: "GEORGETOWN, SC", districtCode: "16" },
  { code: "1603", name: "GREENVILLE-SPARTANSBURG, SC", districtCode: "16" },
  { code: "1604", name: "COLUMBIA, SC", districtCode: "16" },
  { code: "1681", name: "MYRTLE BEACH INTL AIRPORT, SC", districtCode: "16" },
  { code: "1701", name: "BRUNSWICK, GA", districtCode: "17" },
  { code: "1703", name: "SAVANNAH, GA", districtCode: "17" },
  { code: "1704", name: "ATLANTA, GA", districtCode: "17" },
  { code: "1755", name: "Port for Tracking, Savannah, Georgia", districtCode: "17" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "1758", name: "Olympics Security, Atlanta, Georgia", districtCode: "17" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "1759", name: "Atlanta-Olympics, Atlanta, Georgia", districtCode: "17" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "1781", name: "Cobb County International Airport, Kenshaw, Georgia", districtCode: "17" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "1791", name: "DHL ATL Hub - Atlanta, GA", districtCode: "17" }, // no name published by Census as of Dec 2025
  { code: "1801", name: "TAMPA, FL", districtCode: "18" },
  { code: "1803", name: "JACKSONVILLE, FL", districtCode: "18" },
  { code: "1805", name: "FERNANDINA, FL", districtCode: "18" },
  { code: "1807", name: "BOCA GRANDE, FL", districtCode: "18" },
  { code: "1808", name: "ORLANDO, FL", districtCode: "18" },
  { code: "1809", name: "ORLANDO-SANFORD AIRPORT, FL", districtCode: "18" },
  { code: "1814", name: "ST. PETERSBURG, FL", districtCode: "18" },
  { code: "1816", name: "PORT CANAVERAL, FL", districtCode: "18" },
  { code: "1818", name: "PANAMA CITY, FL", districtCode: "18" },
  { code: "1819", name: "PENSACOLA, FL", districtCode: "18" },
  { code: "1820", name: "Port St. Joe, Florida", districtCode: "18" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "1821", name: "PORT MANATEE, FL", districtCode: "18" },
  { code: "1822", name: "FORT MYERS AIRPORT, FL", districtCode: "18" },
  { code: "1880", name: "NAPLES MUNICIPAL USER FEE AIRPORT, NAPLES, FL", districtCode: "18" },
  { code: "1881", name: "Lakeland Linder Airport, Lakeland, Florida", districtCode: "18" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "1883", name: "SARASOTA-BRADENTON AIRPORT, FL", districtCode: "18" },
  { code: "1884", name: "DAYTONA BEACH INTERNATIONAL AIRPORT, FL", districtCode: "18" },
  { code: "1885", name: "MELBOURNE REGIONAL AIRPORT, FL", districtCode: "18" },
  { code: "1886", name: "OCALA REGIONAL AIRPORT, FL", districtCode: "18" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "1887", name: "LEESBURG REGIONAL AIRPORT, FL", districtCode: "18" },
  { code: "1888", name: "ORLANDO EXECUTIVE AIRPORT, FL", districtCode: "18" },
  { code: "1889", name: "ST. AUGUSTINE AIRPORT, FL", districtCode: "18" },
  { code: "1901", name: "MOBILE, AL", districtCode: "19" },
  { code: "1902", name: "GULFPORT, MS", districtCode: "19" },
  { code: "1903", name: "PASCAGOULA, MS", districtCode: "19" },
  { code: "1904", name: "BIRMINGHAM, AL", districtCode: "19" },
  { code: "1905", name: "Apalachicola, Florida", districtCode: "19" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "1906", name: "Carrabelle, Florida", districtCode: "19" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "1910", name: "HUNTSVILLE, AL", districtCode: "19" },
  { code: "2001", name: "MORGAN CITY, LA", districtCode: "20" },
  { code: "2002", name: "NEW ORLEANS, LA", districtCode: "20" },
  { code: "2003", name: "LITTLE ROCK, AR", districtCode: "20" },
  { code: "2004", name: "BATON ROUGE, LA", districtCode: "20" },
  { code: "2005", name: "PORT SULPHUR, LA", districtCode: "20" }, // historical - traded 2010-2017, not in current CBP/Census references (likely delisted)
  { code: "2006", name: "MEMPHIS, TN", districtCode: "20" },
  { code: "2007", name: "NASHVILLE, TN", districtCode: "20" },
  { code: "2008", name: "CHATTANOOGA, TN", districtCode: "20" },
  { code: "2009", name: "DESTREHAN, LA", districtCode: "20" }, // historical - traded 2010-2017, not in current CBP/Census references (likely delisted)
  { code: "2010", name: "GRAMERCY, LA", districtCode: "20" },
  { code: "2011", name: "GREENVILLE, MS", districtCode: "20" },
  { code: "2012", name: "AVONDALE, LA", districtCode: "20" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "2013", name: "ST. ROSE, LA", districtCode: "20" }, // historical - traded 2010-2017, not in current CBP/Census references (likely delisted)
  { code: "2014", name: "GOOD HOPE, LA", districtCode: "20" }, // historical - traded 2011-2017, not in current CBP/Census references (likely delisted)
  { code: "2015", name: "VICKSBURG, MS", districtCode: "20" },
  { code: "2016", name: "KNOXVILLE, TN", districtCode: "20" },
  { code: "2017", name: "LAKE CHARLES, LA", districtCode: "20" },
  { code: "2018", name: "SHREVEPORT-BOSSIER CITY, LA", districtCode: "20" },
  { code: "2027", name: "TRI-CITY AIRPORT, BLOUNTVILLE, TN", districtCode: "20" },
  { code: "2081", name: "Jackson Airport, Jackson, Mississippi", districtCode: "20" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2083", name: "ARKANSAS AEROPLEX, BLYTHVILLE, AR", districtCode: "20" }, // historical - traded 2011-2016, not in current CBP/Census references (likely delisted)
  { code: "2084", name: "Rogers Municipal Airport, Rogers, Arkansas", districtCode: "20" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2095", name: "FEDEX, MEMPHIS, TN", districtCode: "20" },
  { code: "2101", name: "PORT ARTHUR, TX", districtCode: "21" },
  { code: "2102", name: "SABINE, TX", districtCode: "21" },
  { code: "2103", name: "ORANGE, TX", districtCode: "21" },
  { code: "2104", name: "BEAUMONT, TX", districtCode: "21" },
  { code: "2301", name: "BROWNSVILLE, TX", districtCode: "23" },
  { code: "2302", name: "DEL RIO, TX", districtCode: "23" },
  { code: "2303", name: "EAGLE PASS, TX", districtCode: "23" },
  { code: "2304", name: "LAREDO, TX", districtCode: "23" },
  { code: "2305", name: "HILDAGO, TX", districtCode: "23" },
  { code: "2307", name: "RIO GRANDE CITY, TX", districtCode: "23" },
  { code: "2309", name: "PROGRESO, TX", districtCode: "23" },
  { code: "2310", name: "ROMA, TX", districtCode: "23" },
  { code: "2377", name: "Harlingen # Valley International, Harlingen, Texas", districtCode: "23" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2381", name: "EDINBURG AIRPORT, TX", districtCode: "23" }, // historical - traded 2013-2016, not in current CBP/Census references (likely delisted)
  { code: "2383", name: "VALLEY INTERNATIONAL AIRPORT, HARLINGEN, TX", districtCode: "23" },
  { code: "2393", name: "Brownsville-Cartage Control, Brownsville, Texas", districtCode: "23" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2397", name: "Roma-Cartage Control, Roma, Texas", districtCode: "23" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2398", name: "Hidalgo Cartage Control, Pharr, Texas", districtCode: "23" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2401", name: "YSLETA, TX", districtCode: "24" },
  { code: "2402", name: "EL PASO, TX", districtCode: "24" },
  { code: "2403", name: "PRESIDIO, TX", districtCode: "24" },
  { code: "2404", name: "FABENS, TX", districtCode: "24" },
  { code: "2406", name: "COLUMBUS, NM", districtCode: "24" },
  { code: "2407", name: "ALBUQUERQUE, NM", districtCode: "24" },
  { code: "2408", name: "SANTA TERESA, NM", districtCode: "24" },
  { code: "2409", name: "Fort Hancock, Texas", districtCode: "24" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2410", name: "Boquillas, Texas", districtCode: "24" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2481", name: "SANTA TERESA AIRPORT, NM", districtCode: "24" },
  { code: "2482", name: "Roswell Industrial Airport, Roswell, New Mexico", districtCode: "24" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2501", name: "SAN DIEGO, CA", districtCode: "25" },
  { code: "2502", name: "ANDRADE, CA", districtCode: "25" },
  { code: "2503", name: "CALEXICO, CA", districtCode: "25" },
  { code: "2504", name: "SAN YSIDRO, CA", districtCode: "25" },
  { code: "2505", name: "TECATE, CA", districtCode: "25" },
  { code: "2506", name: "OTAY MESA, CA", districtCode: "25" },
  { code: "2507", name: "CALEXICO-EAST, CA", districtCode: "25" },
  { code: "2601", name: "DOUGLAS, AZ", districtCode: "26" },
  { code: "2602", name: "LUKEVILLE, AZ", districtCode: "26" },
  { code: "2603", name: "NACO, AZ", districtCode: "26" },
  { code: "2604", name: "NOGALES, AZ", districtCode: "26" },
  { code: "2605", name: "PHOENIX, AZ", districtCode: "26" },
  { code: "2606", name: "SASABE, AZ", districtCode: "26" },
  { code: "2608", name: "SAN LUIS, AZ", districtCode: "26" },
  { code: "2609", name: "TUCSON, AZ", districtCode: "26" },
  { code: "2681", name: "Scottsdale User Fee Airport, Scottsdale, Arizona", districtCode: "26" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2682", name: "Phoenix-Mesa Gateway Airport, Mesa, Arizona", districtCode: "26" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2704", name: "LOS ANGELES, CA", districtCode: "27" },
  { code: "2707", name: "PORT SAN LUIS, CA", districtCode: "27" }, // not in Schedule D (APRIL25) - observed in live Dec-2025 trade data only
  { code: "2709", name: "LONG BEACH, CA", districtCode: "27" },
  { code: "2711", name: "EL SEGUNDO, CA", districtCode: "27" }, // historical - traded 2010-2019, not in current CBP/Census references (likely delisted)
  { code: "2712", name: "VENTURA, CA", districtCode: "27" },
  { code: "2713", name: "PORT HUENEME, CA", districtCode: "27" },
  { code: "2715", name: "CAPITAN, CA", districtCode: "27" },
  { code: "2719", name: "MORRO BAY, CA", districtCode: "27" },
  { code: "2720", name: "LOS ANGELES INTERNATIONAL AIRPORT, CA", districtCode: "27" },
  { code: "2721", name: "ONTARIO INTERNATIONAL AIRPORT, CA", districtCode: "27" },
  { code: "2722", name: "LAS VEGAS, NV", districtCode: "27" },
  { code: "2755", name: "Los Angeles Alternate, Los Angeles, California", districtCode: "27" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2775", name: "TNT EXPRESS, LAX, CA", districtCode: "27" },
  { code: "2776", name: "IBC PACIFIC", districtCode: "27" },
  { code: "2777", name: "ECCF Micom Inglewood, Ingelwood, California", districtCode: "27" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2781", name: "Palm Springs User Fee, Palm Springs, California", districtCode: "27" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2782", name: "San Bernardino International Airport, San Bernardino, California", districtCode: "27" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2783", name: "Southern California Logistics Airport UFA, Victorville, California", districtCode: "27" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2786", name: "MEADOWS FIELD AIRPORT BAKERSFIELD, CA", districtCode: "27" },
  { code: "2787", name: "John Wayne User Fee Airport, Santa Ana, California", districtCode: "27" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2788", name: "Van Nuys User Fee Airport, Van Nuys, California", districtCode: "27" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2791", name: "DHL-HUB, LOS ANGELES, CA", districtCode: "27" },
  { code: "2795", name: "UPS-ONTARIO, CA", districtCode: "27" },
  { code: "2801", name: "SAN FRANCISCO INTERNATIONAL AIRPORT, CA", districtCode: "28" },
  { code: "2802", name: "EUREKA, CA", districtCode: "28" },
  { code: "2803", name: "FRESNO, CA", districtCode: "28" },
  { code: "2805", name: "MONTEREY, CA", districtCode: "28" },
  { code: "2809", name: "SAN FRANCISCO, CA", districtCode: "28" },
  { code: "2810", name: "STOCKTON, CA", districtCode: "28" },
  { code: "2811", name: "OAKLAND, CA", districtCode: "28" },
  { code: "2812", name: "RICHMOND, CA", districtCode: "28" },
  { code: "2813", name: "ALAMEDA, CA", districtCode: "28" }, // historical - traded 2010-2017, not in current CBP/Census references (likely delisted)
  { code: "2815", name: "CROCKETT, CA", districtCode: "28" },
  { code: "2816", name: "(former) Sacramento, California", districtCode: "28" }, // historical - traded 2010, not in current CBP/Census references; no name ever published by Census
  { code: "2820", name: "MARTINEZ, CA", districtCode: "28" },
  { code: "2821", name: "REDWOOD CITY, CA", districtCode: "28" },
  { code: "2827", name: "SELBY, CA", districtCode: "28" },
  { code: "2828", name: "SAN JOAQUIN RIVER, CA", districtCode: "28" },
  { code: "2829", name: "SAN PABLO BAY, CA", districtCode: "28" },
  { code: "2830", name: "CARQUINEZ STRAIT, CA", districtCode: "28" },
  { code: "2831", name: "Suisin Bay, California", districtCode: "28" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "2833", name: "RENO, NV", districtCode: "28" },
  { code: "2834", name: "SAN JOSE INTERNATIONAL AIRPORT, CA", districtCode: "28" },
  { code: "2835", name: "SACRAMENTO INTERNATIONAL AIRPORT, CA", districtCode: "28" },
  { code: "2895", name: "FEDEX, OAKLAND, CA", districtCode: "28" },
  { code: "2901", name: "ASTORIA, OR", districtCode: "29" },
  { code: "2902", name: "NEWPORT, OR", districtCode: "29" },
  { code: "2903", name: "COOS BAY, OR", districtCode: "29" },
  { code: "2904", name: "PORTLAND, OR", districtCode: "29" },
  { code: "2905", name: "LONGVIEW, WA", districtCode: "29" },
  { code: "2907", name: "BOISE, ID", districtCode: "29" },
  { code: "2908", name: "VANCOUVER, WA", districtCode: "29" },
  { code: "2909", name: "KALAMA, WA", districtCode: "29" },
  { code: "2910", name: "PORTLAND INTERNATIONAL AIRPORT, WA", districtCode: "29" },
  { code: "2983", name: "Hillsboro Airport, Hillsboro, Oregon", districtCode: "29" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3001", name: "SEATTLE, WA", districtCode: "30" },
  { code: "3002", name: "TACOMA, WA", districtCode: "30" },
  { code: "3003", name: "ABERDEEN-HOQUIAM, WA", districtCode: "30" },
  { code: "3004", name: "BLAINE, WA", districtCode: "30" },
  { code: "3005", name: "BELLINGHAM, WA", districtCode: "30" },
  { code: "3006", name: "EVERETT, WA", districtCode: "30" },
  { code: "3007", name: "PORT ANGELES, WA", districtCode: "30" },
  { code: "3008", name: "PORT TOWNSEND, WA", districtCode: "30" },
  { code: "3009", name: "SUMAS, WA", districtCode: "30" },
  { code: "3010", name: "ANACORTES, WA", districtCode: "30" },
  { code: "3011", name: "NIGHTHAWK, WA", districtCode: "30" },
  { code: "3012", name: "DANVILLE, WA", districtCode: "30" },
  { code: "3013", name: "FERRY, WA", districtCode: "30" },
  { code: "3014", name: "FRIDAY HARBOR, WA", districtCode: "30" },
  { code: "3015", name: "BOUNDARY, WA", districtCode: "30" },
  { code: "3016", name: "LAURIER, WA", districtCode: "30" },
  { code: "3017", name: "POINT ROBERTS, WA", districtCode: "30" },
  { code: "3018", name: "KENMORE AIR HARBOR, WA", districtCode: "30" },
  { code: "3019", name: "OROVILLE, WA", districtCode: "30" },
  { code: "3020", name: "FRONTIER, WA", districtCode: "30" },
  { code: "3022", name: "SPOKANE, WA", districtCode: "30" },
  { code: "3023", name: "LYNDEN, WA", districtCode: "30" },
  { code: "3025", name: "METALINE FALLS, WA", districtCode: "30" },
  { code: "3026", name: "OLYMPIA, WA", districtCode: "30" },
  { code: "3027", name: "NEAH BAY, WA", districtCode: "30" }, // historical - traded 2010-2017, not in current CBP/Census references (likely delisted)
  { code: "3029", name: "SEATTLE-TACOMA INTERNATIONAL AIRPORT, WA", districtCode: "30" },
  { code: "3071", name: "UPS, SEATTLE, WA", districtCode: "30" },
  { code: "3072", name: "AVION BROKERS, SEATTLE, WA", districtCode: "30" },
  { code: "3073", name: "DHL, SEATTLE, WA", districtCode: "30" },
  { code: "3074", name: "AIRBORNE EXPRESS, SEATTLE, WA", districtCode: "30" },
  { code: "3081", name: "YAKIMA AIR TERMINAL, WA", districtCode: "30" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "3082", name: "GRANT COUNTY AIRPORT, WA", districtCode: "30" },
  { code: "3095", name: "UPS, SEATTLE, WA", districtCode: "30" },
  { code: "3099", name: "Port of Puget Sound, Seattle, Washington", districtCode: "30" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3101", name: "JUNEAU, AK", districtCode: "31" },
  { code: "3102", name: "KETCHIKAN, AK", districtCode: "31" },
  { code: "3103", name: "SKAGWAY, AK", districtCode: "31" },
  { code: "3104", name: "ALCAN, AK", districtCode: "31" },
  { code: "3105", name: "WRANGELL, AK", districtCode: "31" },
  { code: "3106", name: "DALTON CACHE, AK", districtCode: "31" },
  { code: "3107", name: "VALDEZ, AK", districtCode: "31" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "3111", name: "FAIRBANKS, AK", districtCode: "31" },
  { code: "3112", name: "PETERSBURG, AK", districtCode: "31" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "3115", name: "SITKA, AK", districtCode: "31" },
  { code: "3124", name: "Pelican, Alaska", districtCode: "31" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3126", name: "ANCHORAGE, AK", districtCode: "31" },
  { code: "3127", name: "Kodiak, AK", districtCode: "31" }, // historical - traded 2010, not in current CBP/Census references; no name ever published by Census
  { code: "3181", name: "Saint Paul Airport, Anchorage, Alaska", districtCode: "31" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3195", name: "FEDEX, ANCHORAGE, AK", districtCode: "31" },
  { code: "3196", name: "UPS, ANCHORAGE, AK", districtCode: "31" },
  { code: "3201", name: "HONOLULU, HI", districtCode: "32" },
  { code: "3202", name: "HILO, HI", districtCode: "32" },
  { code: "3203", name: "KAHULUI, HI", districtCode: "32" },
  { code: "3204", name: "NAWILIWILI-PORT ALLEN, HI", districtCode: "32" },
  { code: "3205", name: "HONOLULU INTERNATIONAL AIRPORT, HI", districtCode: "32" },
  { code: "3206", name: "KONA, HI", districtCode: "32" },
  { code: "3207", name: "Guam Preclearance, Tamuning, Guam", districtCode: "32" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3211", name: "Saipan, Tamuning, Guam", districtCode: "32" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3212", name: "Tinian, Tamuning, Guam", districtCode: "32" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3213", name: "Rota, Tamuning, Guam", districtCode: "32" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3279", name: "FEDEX CORP HONOLULU, HI", districtCode: "32" }, // not in Schedule D (APRIL25) - observed in live Dec-2025 trade data only
  { code: "3301", name: "RAYMOND, MT", districtCode: "33" },
  { code: "3302", name: "EASTPORT, ID", districtCode: "33" },
  { code: "3303", name: "SALT LAKE CITY, UT", districtCode: "33" },
  { code: "3304", name: "GREAT FALLS, MT", districtCode: "33" },
  { code: "3305", name: "BUTTE, MT", districtCode: "33" },
  { code: "3306", name: "TURNER, MT", districtCode: "33" },
  { code: "3307", name: "DENVER, CO", districtCode: "33" },
  { code: "3308", name: "PORTHILL, ID", districtCode: "33" },
  { code: "3309", name: "SCOBEY, MT", districtCode: "33" },
  { code: "3310", name: "SWEETGRASS, MT", districtCode: "33" },
  { code: "3312", name: "WHITETAIL, MT", districtCode: "33" }, // historical - traded 2010-2013, not in current CBP/Census references (likely delisted)
  { code: "3316", name: "PIEGAN, MT", districtCode: "33" },
  { code: "3317", name: "OPHEIM, MT", districtCode: "33" },
  { code: "3318", name: "ROOSVILLE, MT", districtCode: "33" },
  { code: "3319", name: "MORGAN, MT", districtCode: "33" },
  { code: "3321", name: "WHITLASH, MT", districtCode: "33" },
  { code: "3322", name: "DEL BONITA, MT", districtCode: "33" },
  { code: "3323", name: "WILDHORSE, MT", districtCode: "33" },
  { code: "3324", name: "KALISPELL AIRPORT, MT", districtCode: "33" },
  { code: "3325", name: "HAVRE, MT", districtCode: "33" },
  { code: "3327", name: "Vancouver, BC, Canada", districtCode: "33" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3328", name: "Calgary, Alberta, Canada", districtCode: "33" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3329", name: "Edmonton, Alberta, Canada", districtCode: "33" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3332", name: "CASPER, WY", districtCode: "33" }, // historical - traded 2013-2015, not in current CBP/Census references (likely delisted)
  { code: "3381", name: "Missoula User Fee Airport, Missoula, Montana", districtCode: "33" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3382", name: "(former) Casper, Wyoming", districtCode: "33" }, // historical - traded 2010-2012, not in current CBP/Census references; no name ever published by Census
  { code: "3383", name: "Jeffco User Fee Airport, Broofield, Colorado", districtCode: "33" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3384", name: "CENTENNIAL AIRPORT, CO", districtCode: "33" },
  { code: "3385", name: "EAGLE COUNTY REGIONAL AIRPORT, CO", districtCode: "33" },
  { code: "3386", name: "BOZEMAN YELLOWSTONE USER FEE AIRPORT, BELGRADE, MT", districtCode: "33" },
  { code: "3401", name: "PEMBINA, ND", districtCode: "34" },
  { code: "3402", name: "NOYES, MN", districtCode: "34" }, // historical - traded 2010-2018, not in current CBP/Census references (likely delisted)
  { code: "3403", name: "PORTAL, ND", districtCode: "34" },
  { code: "3404", name: "NECHE, ND", districtCode: "34" },
  { code: "3405", name: "ST. JOHN, ND", districtCode: "34" },
  { code: "3406", name: "NORTHGATE, ND", districtCode: "34" },
  { code: "3407", name: "WALHALLA, ND", districtCode: "34" },
  { code: "3408", name: "HANNAH, ND", districtCode: "34" },
  { code: "3409", name: "SARLES, ND", districtCode: "34" },
  { code: "3410", name: "AMBROSE, ND", districtCode: "34" },
  { code: "3411", name: "FARGO, ND", districtCode: "34" },
  { code: "3413", name: "ANTLER, ND", districtCode: "34" },
  { code: "3414", name: "SHERWOOD, ND", districtCode: "34" },
  { code: "3415", name: "HANSBORO, ND", districtCode: "34" },
  { code: "3416", name: "MAIDA, ND", districtCode: "34" },
  { code: "3417", name: "FORTUNA, ND", districtCode: "34" },
  { code: "3419", name: "WESTHOPE, ND", districtCode: "34" },
  { code: "3420", name: "NOONAN, ND", districtCode: "34" },
  { code: "3421", name: "CARBURY, ND", districtCode: "34" },
  { code: "3422", name: "DUNSEITH, ND", districtCode: "34" },
  { code: "3423", name: "WARROAD, MN", districtCode: "34" },
  { code: "3424", name: "BAUDETTE, MN", districtCode: "34" },
  { code: "3425", name: "PINECREEK, MN", districtCode: "34" },
  { code: "3426", name: "ROSEAU, MN", districtCode: "34" },
  { code: "3427", name: "GRAND FORKS, ND", districtCode: "34" },
  { code: "3428", name: "Winnipeg International Airport, Winnipeg, Canada", districtCode: "34" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3429", name: "Crane Lake, Minnesota", districtCode: "34" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3430", name: "LANCASTER, MN", districtCode: "34" },
  { code: "3433", name: "WILLISTON AIRPORT, ND", districtCode: "34" },
  { code: "3434", name: "MINOT AIRPORT, ND", districtCode: "34" },
  { code: "3501", name: "MINNEAPOLIS-ST. PAUL, MN", districtCode: "35" },
  { code: "3502", name: "SIOUX FALLS, SD", districtCode: "35" },
  { code: "3510", name: "DULUTH, MN - SUPERIOR, WI", districtCode: "35" },
  { code: "3511", name: "ASHLAND, WI", districtCode: "35" },
  { code: "3512", name: "OMAHA, NE", districtCode: "35" },
  { code: "3513", name: "DES MOINES, IA", districtCode: "35" },
  { code: "3581", name: "ROCHESTER USER FEE AIRPORT, MN", districtCode: "35" },
  { code: "3604", name: "INTERNATIONAL FALLS-RANIER, MN", districtCode: "36" },
  { code: "3613", name: "GRAND PORTAGE, MN", districtCode: "36" },
  { code: "3614", name: "(former) Silver Bay, Minnesota", districtCode: "36" }, // historical - traded 2010, not in current CBP/Census references; no name ever published by Census
  { code: "3701", name: "MILWAUKEE, WI", districtCode: "37" },
  { code: "3702", name: "MARINETTE, WI", districtCode: "37" },
  { code: "3703", name: "GREEN BAY, WI", districtCode: "37" },
  { code: "3706", name: "MANITOWOC, WI", districtCode: "37" },
  { code: "3707", name: "Sheboygan, Wisconsin", districtCode: "37" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3708", name: "RACINE, WI", districtCode: "37" },
  { code: "3781", name: "Appleton International Airport, Appleton, Wisconsin", districtCode: "37" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3801", name: "DETROIT, MI", districtCode: "38" },
  { code: "3802", name: "PORT HURON, MI", districtCode: "38" },
  { code: "3803", name: "SAULT STE MARIE, MI", districtCode: "38" },
  { code: "3804", name: "SAGINAW-BAY CITY, MI", districtCode: "38" },
  { code: "3805", name: "BATTLE CREEK, MI", districtCode: "38" },
  { code: "3806", name: "GRAND RAPIDS, MI", districtCode: "38" },
  { code: "3807", name: "DETROIT METROPOLITAN AIRPORT, MI", districtCode: "38" },
  { code: "3808", name: "ESCANABA, MI", districtCode: "38" },
  { code: "3809", name: "MARQUETTE, MI", districtCode: "38" },
  { code: "3814", name: "ALGONAC, MI", districtCode: "38" },
  { code: "3815", name: "MUSKEGON, MI", districtCode: "38" },
  { code: "3816", name: "GRAND HAVEN, MI", districtCode: "38" },
  { code: "3818", name: "ROGERS CITY, MI", districtCode: "38" },
  { code: "3819", name: "DETOUR CITY, MI", districtCode: "38" },
  { code: "3820", name: "MACKINAC ISLAND, MI", districtCode: "38" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "3822", name: "South Haven, Michigan", districtCode: "38" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3842", name: "PRESQUE ISLE, MI", districtCode: "38" },
  { code: "3843", name: "ALPENA, MI", districtCode: "38" },
  { code: "3844", name: "FERRYSBURG, MI", districtCode: "38" }, // historical - traded 2010-2015, not in current CBP/Census references (likely delisted)
  { code: "3881", name: "OAKLAND-PONTIAC AIRPORT, MI", districtCode: "38" },
  { code: "3882", name: "WILLOW RUN AIRPORT, YPSILANTI, MI", districtCode: "38" },
  { code: "3883", name: "CAPITAL REGION INTERNATIONAL AIRPORT, LANSING, MI", districtCode: "38" },
  { code: "3901", name: "CHICAGO, IL", districtCode: "39" },
  { code: "3902", name: "PEORIA, IL", districtCode: "39" },
  { code: "3905", name: "GARY, IN", districtCode: "39" },
  { code: "3908", name: "DAVENPORT, IA-ROCK ISLAND, IL", districtCode: "39" },
  { code: "3909", name: "ROCKFORD AIRPORT, IL", districtCode: "39" },
  { code: "3910", name: "CHICAGO MIDWAY INTL AIRPORT, IL", districtCode: "39" },
  { code: "3971", name: "TNT EXPRESS CONSIGNMENT, CHICAGO, IL", districtCode: "39" },
  { code: "3972", name: "ECCF IBC Chicago, Chicago, Illinois", districtCode: "39" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "3981", name: "WAUKEGAN AIRPORT, IL", districtCode: "39" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "3983", name: "CHICAGO EXECUTIVE AIRPORT, IL (FORMALLY PAL-WAUKEE", districtCode: "39" }, // verbatim from Census API - truncated/unclosed parenthetical in their source data
  { code: "3984", name: "DUPAGE AIRPORT, IL", districtCode: "39" }, // not in Schedule D (APRIL25) - observed in live Dec-2025 trade data only
  { code: "3985", name: "DECATUR USER FEE AIRPORT, IL", districtCode: "39" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "3987", name: "UFA UI WILLARD AIRPORT, SAVOY, IL", districtCode: "39" },
  { code: "3991", name: "DHL Chicago Hub, Chicago, Illinois", districtCode: "39" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "4101", name: "CLEVELAND, OH", districtCode: "41" },
  { code: "4102", name: "CINCINNATI-LAWRENCEBURG, OH", districtCode: "41" },
  { code: "4103", name: "COLUMBUS, OH", districtCode: "41" },
  { code: "4104", name: "DAYTON, OH", districtCode: "41" },
  { code: "4105", name: "TOLEDO-SANDUSKY, OH", districtCode: "41" },
  { code: "4106", name: "ERIE, PA", districtCode: "41" },
  { code: "4110", name: "INDIANAPOLIS, IN", districtCode: "41" },
  { code: "4112", name: "AKRON, OH", districtCode: "41" }, // historical - traded 2010-2017, not in current CBP/Census references (likely delisted)
  { code: "4115", name: "LOUISVILLE, KY", districtCode: "41" },
  { code: "4116", name: "OWENSBORO-EVANSVILLE, IN", districtCode: "41" },
  { code: "4117", name: "HURON, OH", districtCode: "41" }, // historical - traded 2010-2024, not in current CBP/Census references (likely delisted)
  { code: "4121", name: "LORAIN, OH", districtCode: "41" },
  { code: "4122", name: "ASHTABULA-CONNEAUT, OH", districtCode: "41" },
  { code: "4183", name: "FORT WAYNE AIRPORT, IN", districtCode: "41" },
  { code: "4184", name: "BLUEGRASS AIRPORT, LEXINGTON, KY", districtCode: "41" },
  { code: "4185", name: "HULMAN REGIONAL AIRPORT, IN", districtCode: "41" }, // historical - traded 2011-2016, not in current CBP/Census references (likely delisted)
  { code: "4196", name: "UPS COURIER", districtCode: "41" },
  { code: "4197", name: "DHL CINCINNATI, OH", districtCode: "41" },
  { code: "4198", name: "FEDEX, INDIANAPOLIS, IN", districtCode: "41" },
  { code: "4501", name: "KANSAS CITY, MO", districtCode: "45" },
  { code: "4502", name: "ST. JOSEPH, MO", districtCode: "45" },
  { code: "4503", name: "ST. LOUIS, MO", districtCode: "45" },
  { code: "4504", name: "WICHITA, KS", districtCode: "45" },
  { code: "4505", name: "SPRINGFIELD, MO", districtCode: "45" },
  { code: "4506", name: "SPIRIT OF ST. LOUIS AIRPORT, MO", districtCode: "45" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "4507", name: "Kansas City Smart Port, Kansas City, Kansas", districtCode: "45" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "4581", name: "MIDAMERICAN AIRPORT, MASCOUTAH, IL", districtCode: "45" },
  { code: "4601", name: "New York/Newark Area, Newark, New Jersey", districtCode: "46" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "46"
  { code: "4602", name: "Perth Amboy, New Jersey", districtCode: "46" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "46"
  { code: "4670", name: "ECCF UPS Newark, Newark, New Jersey", districtCode: "46" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "46"
  { code: "4671", name: "ECCF FedEx Corp Newark, Newark, New Jersey", districtCode: "46" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "46"
  { code: "4681", name: "Morristown Airport, Morristown, New Jersey", districtCode: "46" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "46"
  { code: "4682", name: "Stewart International Airport UFF, New Windsor, New York", districtCode: "46" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "46"
  { code: "4701", name: "John F. Kennedy Airport, Jamaica, New York", districtCode: "47" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "47"
  { code: "4771", name: "ECCF NYACC JFK Airport, Jamaica, New York", districtCode: "47" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "47"
  { code: "4772", name: "ECCF DHL Airways JFK Airport, Jamaica, New York", districtCode: "47" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "47"
  { code: "4773", name: "ECCF Micom JFK, Jamaica, New York", districtCode: "47" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "47"
  { code: "4774", name: "ECCF IBC JFK, Jamaica, New York", districtCode: "47" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "47"
  { code: "4778", name: "ECCF FedEx Corp JFK Airport, Jamaica, New York", districtCode: "47" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "47"
  { code: "4901", name: "AGUADILLA, PR", districtCode: "49" },
  { code: "4904", name: "FAJARDO, PR", districtCode: "49" },
  { code: "4905", name: "GUANICA, PR", districtCode: "49" }, // historical - traded 2010-2017, not in current CBP/Census references (likely delisted)
  { code: "4906", name: "HUMACAO, PR", districtCode: "49" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "4907", name: "MAYAGUEZ, PR", districtCode: "49" },
  { code: "4908", name: "PONCE, PR", districtCode: "49" },
  { code: "4909", name: "SAN JUAN, PR", districtCode: "49" },
  { code: "4911", name: "JOBOS, PR", districtCode: "49" }, // historical - traded 2010-2016, not in current CBP/Census references (likely delisted)
  { code: "4912", name: "GUAYANILLA, PR", districtCode: "49" }, // historical - traded 2010-2017, not in current CBP/Census references (likely delisted)
  { code: "4913", name: "SAN JUAN INTERNATIONAL AIRPORT, PR", districtCode: "49" },
  { code: "5101", name: "CHARLOTTE AMALIE, VI", districtCode: "51" },
  { code: "5102", name: "CRUZ BAY, VI", districtCode: "51" },
  { code: "5103", name: "CORAL BAY, VI", districtCode: "51" }, // historical - traded 2010-2017, not in current CBP/Census references (likely delisted)
  { code: "5104", name: "CHRISTIANSTED, VI", districtCode: "51" },
  { code: "5105", name: "FREDERIKSTED, VI", districtCode: "51" },
  { code: "5201", name: "MIAMI, FL", districtCode: "52" },
  { code: "5202", name: "KEY WEST, FL", districtCode: "52" },
  { code: "5203", name: "PORT EVERGLADES, FL", districtCode: "52" },
  { code: "5204", name: "WEST PALM BEACH, FL", districtCode: "52" },
  { code: "5205", name: "FORT PIERCE, FL", districtCode: "52" },
  { code: "5206", name: "MIAMI INTERNATIONAL AIRPORT, FL", districtCode: "52" },
  { code: "5210", name: "FT. LAUDERDALE INTERNATIONAL AIRPORT, FL", districtCode: "52" },
  { code: "5255", name: "Miami Alternate, Miami, Florida", districtCode: "52" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5274", name: "Fedex Corp Miami ECCF, Miami, Florida (Port 5297 is used)", districtCode: "52" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5281", name: "Marathon International Airport, Marathon, Florida", districtCode: "52" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5282", name: "Boca Raton Airport, Boca Raton, Florida", districtCode: "52" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5283", name: "Witham Field GAF, Stuart, Florida", districtCode: "52" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5295", name: "UPS, MIAMI, FL", districtCode: "52" },
  { code: "5296", name: "DHL, MIAMI, FL", districtCode: "52" },
  { code: "5297", name: "FEDEX, MIAMI, FL", districtCode: "52" },
  { code: "5298", name: "IBC COURIER HUB, FL", districtCode: "52" },
  { code: "5301", name: "HOUSTON, TX", districtCode: "53" },
  { code: "5306", name: "TEXAS CITY, TX", districtCode: "53" },
  { code: "5309", name: "HOUSTON INTERCONTINENTAL AIRPORT, TX", districtCode: "53" },
  { code: "5310", name: "GALVESTON, TX", districtCode: "53" },
  { code: "5311", name: "FREEPORT, TX", districtCode: "53" },
  { code: "5312", name: "CORPUS CHRISTI, TX", districtCode: "53" },
  { code: "5313", name: "PORT LAVACA, TX", districtCode: "53" },
  { code: "5314", name: "Hobby International Airport, Houston, Texas", districtCode: "53" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5315", name: "Ellington Field, Houston, Texas", districtCode: "53" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5381", name: "SUGAR LAND REGIONAL AIRPORT, TX", districtCode: "53" },
  { code: "5382", name: "Conroe-North, Conroe, Texas", districtCode: "53" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5401", name: "WASHINGTON, DC", districtCode: "54" },
  { code: "5402", name: "ALEXANDRIA, VA", districtCode: "54" },
  { code: "5501", name: "DALLAS-FORT WORTH, TX", districtCode: "55" },
  { code: "5502", name: "AMARILLO, TX", districtCode: "55" },
  { code: "5503", name: "LUBBOCK, TX", districtCode: "55" },
  { code: "5504", name: "OKLAHOMA CITY, OK", districtCode: "55" },
  { code: "5505", name: "TULSA, OK", districtCode: "55" },
  { code: "5506", name: "AUSTIN, TX", districtCode: "55" },
  { code: "5507", name: "SAN ANTONIO, TX", districtCode: "55" },
  { code: "5582", name: "MIDLAND INTERNATIONAL AIRPORT, TX", districtCode: "55" },
  { code: "5583", name: "FORT WORTH ALLIANCE AIRPORT, TX", districtCode: "55" },
  { code: "5584", name: "ADDISON AIRPORT, DALLAS, TX", districtCode: "55" },
  { code: "5585", name: "Collin County Regional UFA, McKinney, Texas", districtCode: "55" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5586", name: "Ardmore Municipal Airport, Ardmore, Oklahoma", districtCode: "55" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5587", name: "Kelly Field Annex, San Antonio, Texas", districtCode: "55" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5588", name: "DALLAS LOVE FIELD, DALLAS, TX", districtCode: "55" },
  { code: "5589", name: "Meacham International Airport, Fort Worth, Texas", districtCode: "55" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D
  { code: "5901", name: "NORFOLK/MOBILE/CHARLESTON", districtCode: "59" },
  { code: "6000", name: "VESSELS UNDER OWN POWER", districtCode: "60" }, // not in Schedule D (APRIL25) - observed in live Dec-2025 trade data only
  { code: "7000", name: "LOW VALUE", districtCode: "70" },
  { code: "7001", name: "CANADIAN LATE RECEIPTS ESTIMATE", districtCode: "70" },
  { code: "7010", name: "CANADIAN LATE RECEIPTS ESTIMATE", districtCode: "70" }, // not in Schedule D (APRIL25) - observed in live Dec-2025 trade data only
  { code: "7070", name: "LOW VALUE", districtCode: "70" }, // not in Schedule D (APRIL25) - observed in live Dec-2025 trade data only
  { code: "7100", name: "Northeast Region, Boston, Massachusetts", districtCode: "71" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "71"
  { code: "7121", name: "Montreal Quebec Canada, Montreal, Canada", districtCode: "71" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "71"
  { code: "7122", name: "Toronto Ontario Canada, Toronto, Canada", districtCode: "71" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "71"
  { code: "7400", name: "Southeast Region, Miami, Florida", districtCode: "74" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "74"
  { code: "7401", name: "CBP St. Thomas Preclearance, St. Thomas, US Virgin Islands", districtCode: "74" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "74"
  { code: "7404", name: "CBP St. Croix Preclearance, St. Croix, US Virgin Islands", districtCode: "74" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "74"
  { code: "7421", name: "CBP Bermuda Preclearance, Washington, DC", districtCode: "74" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "74"
  { code: "7422", name: "CBP Freeport Preclearance, Washington, DC", districtCode: "74" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "74"
  { code: "7423", name: "CBP, Nassau Preclearance, Washington, DC", districtCode: "74" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "74"
  { code: "7424", name: "CBP, Aruba Preclearance, Washington, DC", districtCode: "74" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "74"
  { code: "7425", name: "CBP, Punta Cana International Preclearance, Washington, DC", districtCode: "74" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "74"
  { code: "7500", name: "South Central Region, New Orleans, Louisiana", districtCode: "75" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "75"
  { code: "7541", name: "Dublin, IE Preclearance, Washington, DC", districtCode: "75" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "75"
  { code: "7542", name: "Shannon IE Preclearance, Washington, DC", districtCode: "75" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "75"
  { code: "7543", name: "CBP Abu Dhabi Preclearance, Washington, DC", districtCode: "75" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "75"
  { code: "7600", name: "Southwest Region, Houston, Texas", districtCode: "76" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "76"
  { code: "7700", name: "Pacific Region, Long Beach, California", districtCode: "77" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "77"
  { code: "7728", name: "Pacific Region, San Francisco, California", districtCode: "77" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "77"
  { code: "7729", name: "Pacific Region, San Francisco, California", districtCode: "77" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "77"
  { code: "7900", name: "CBP North Central Region, Chicago, Illinois", districtCode: "79" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "79"
  { code: "7922", name: "CBP Vancouver Preclearance, Washington, DC", districtCode: "79" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "79"
  { code: "7923", name: "CBP Calgary Preclearance, Washington, DC", districtCode: "79" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "79"
  { code: "7924", name: "CBP Edmonton Preclearance, Washington, DC", districtCode: "79" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "79"
  { code: "7925", name: "CBP Montreal Preclearance, Washington, DC", districtCode: "79" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "79"
  { code: "7926", name: "CBP Toronto Preclearance, Washington, DC", districtCode: "79" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "79"
  { code: "7928", name: "CBP Winnipeg Preclearance, Washington, DC", districtCode: "79" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "79"
  { code: "7929", name: "CBP Ottawa Preclearance, Washington, DC", districtCode: "79" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "79"
  { code: "7930", name: "CBP Victoria Preclearance, Washington, DC", districtCode: "79" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "79"
  { code: "7931", name: "CBP Halifax Nova Scotia Preclearance, Washington, DC", districtCode: "79" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "79"
  { code: "8000", name: "MAIL SHIPMENTS", districtCode: "80" }, // not in Schedule D (APRIL25) - observed in live Dec-2025 trade data only
  { code: "9232", name: "Calgary, Alberta", districtCode: "92" }, // from CBP ACE Appendix E (Feb 2026) - not in Census Schedule D; no matching Census district for prefix "92"

];
