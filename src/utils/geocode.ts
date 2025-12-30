// src/utils/geocode.ts
// =============================================
// INDIAN CITY & STATE COORDINATES + API FALLBACK
// =============================================

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  
  // ═══════════════════════════════════════════════════════════
  // STATES (Capital coordinates as fallback)
  // ═══════════════════════════════════════════════════════════
  'andhra pradesh': { lat: 16.5062, lng: 80.6480 }, // Vijayawada
  'arunachal pradesh': { lat: 27.0844, lng: 93.6053 }, // Itanagar
  'assam': { lat: 26.1445, lng: 91.7362 }, // Guwahati
  'bihar': { lat: 25.5941, lng: 85.1376 }, // Patna
  'chhattisgarh': { lat: 21.2514, lng: 81.6296 }, // Raipur
  'goa': { lat: 15.4909, lng: 73.8278 }, // Panaji
  'gujarat': { lat: 23.2156, lng: 72.6369 }, // Gandhinagar
  'haryana': { lat: 30.7333, lng: 76.7794 }, // Chandigarh
  'himachal pradesh': { lat: 31.1048, lng: 77.1734 }, // Shimla
  'jharkhand': { lat: 23.3441, lng: 85.3096 }, // Ranchi
  'karnataka': { lat: 12.9716, lng: 77.5946 }, // Bangalore
  'kerala': { lat: 8.5241, lng: 76.9366 }, // Trivandrum
  'madhya pradesh': { lat: 23.2599, lng: 77.4126 }, // Bhopal
  'maharashtra': { lat: 19.0760, lng: 72.8777 }, // Mumbai
  'manipur': { lat: 24.8170, lng: 93.9368 }, // Imphal
  'meghalaya': { lat: 25.5788, lng: 91.8933 }, // Shillong
  'mizoram': { lat: 23.7271, lng: 92.7176 }, // Aizawl
  'nagaland': { lat: 25.6586, lng: 94.1086 }, // Kohima
  'odisha': { lat: 20.2961, lng: 85.8245 }, // Bhubaneswar
  'orissa': { lat: 20.2961, lng: 85.8245 }, // Bhubaneswar (old name)
  'punjab': { lat: 30.7333, lng: 76.7794 }, // Chandigarh
  'rajasthan': { lat: 26.9124, lng: 75.7873 }, // Jaipur
  'sikkim': { lat: 27.3389, lng: 88.6065 }, // Gangtok
  'tamil nadu': { lat: 13.0827, lng: 80.2707 }, // Chennai
  'tamilnadu': { lat: 13.0827, lng: 80.2707 }, // Chennai
  'telangana': { lat: 17.3850, lng: 78.4867 }, // Hyderabad
  'tripura': { lat: 23.8315, lng: 91.2868 }, // Agartala
  'uttar pradesh': { lat: 26.8467, lng: 80.9462 }, // Lucknow
  'uttarakhand': { lat: 30.3165, lng: 78.0322 }, // Dehradun
  'west bengal': { lat: 22.5726, lng: 88.3639 }, // Kolkata
  'westbengal': { lat: 22.5726, lng: 88.3639 }, // Kolkata
  
  // Union Territories
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'new delhi': { lat: 28.6139, lng: 77.2090 },
  'jammu and kashmir': { lat: 34.0837, lng: 74.7973 },
  'jammu & kashmir': { lat: 34.0837, lng: 74.7973 },
  'ladakh': { lat: 34.1526, lng: 77.5771 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'puducherry': { lat: 11.9416, lng: 79.8083 },
  'pondicherry': { lat: 11.9416, lng: 79.8083 },
  'andaman and nicobar': { lat: 11.6234, lng: 92.7265 },
  'andaman & nicobar': { lat: 11.6234, lng: 92.7265 },
  'dadra and nagar haveli': { lat: 20.2766, lng: 73.0169 },
  'daman and diu': { lat: 20.3974, lng: 72.8328 },
  'lakshadweep': { lat: 10.5669, lng: 72.6369 },

  // ═══════════════════════════════════════════════════════════
  // GUJARAT
  // ═══════════════════════════════════════════════════════════
  'vapi': { lat: 20.3714, lng: 72.9289 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'vadodara': { lat: 22.3072, lng: 73.1812 },
  'rajkot': { lat: 22.3039, lng: 70.8022 },
  'gandhinagar': { lat: 23.2156, lng: 72.6369 },
  'bhavnagar': { lat: 21.7645, lng: 72.1519 },
  'jamnagar': { lat: 22.4707, lng: 70.0577 },
  'junagadh': { lat: 21.5222, lng: 70.4579 },
  'anand': { lat: 22.5645, lng: 72.9289 },
  'navsari': { lat: 20.9467, lng: 72.9520 },
  'morbi': { lat: 22.8173, lng: 70.8378 },
  'nadiad': { lat: 22.6916, lng: 72.8634 },
  'bharuch': { lat: 21.7051, lng: 72.9959 },
  'porbandar': { lat: 21.6417, lng: 69.6293 },
  'godhra': { lat: 22.7788, lng: 73.6143 },
  'valsad': { lat: 20.5992, lng: 72.9342 },
  'ankleshwar': { lat: 21.6265, lng: 73.0152 },
  'mehsana': { lat: 23.5880, lng: 72.3693 },
  'palanpur': { lat: 24.1725, lng: 72.4381 },
  'veraval': { lat: 20.9159, lng: 70.3629 },
  'gandhidham': { lat: 23.0753, lng: 70.1337 },
  'mundra': { lat: 22.8394, lng: 69.7214 },
  'dwarka': { lat: 22.2442, lng: 68.9685 },
  'kutch': { lat: 23.7337, lng: 69.8597 },
  'bhuj': { lat: 23.2420, lng: 69.6669 },
  'dahod': { lat: 22.8350, lng: 74.2525 },
  'surendranagar': { lat: 22.7289, lng: 71.6480 },
  'patan': { lat: 23.8493, lng: 72.1266 },
  'himmatnagar': { lat: 23.5969, lng: 72.9660 },
  'amreli': { lat: 21.5990, lng: 71.2163 },
  'botad': { lat: 22.1694, lng: 71.6686 },
  'kheda': { lat: 22.7505, lng: 72.6847 },
  'sabarkantha': { lat: 23.6252, lng: 73.0543 },

  // ═══════════════════════════════════════════════════════════
  // MAHARASHTRA
  // ═══════════════════════════════════════════════════════════
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'nashik': { lat: 19.9975, lng: 73.7898 },
  'thane': { lat: 19.2183, lng: 72.9781 },
  'aurangabad': { lat: 19.8762, lng: 75.3433 },
  'solapur': { lat: 17.6599, lng: 75.9064 },
  'kolhapur': { lat: 16.7050, lng: 74.2433 },
  'sangli': { lat: 16.8524, lng: 74.5815 },
  'satara': { lat: 17.6805, lng: 74.0183 },
  'ahmednagar': { lat: 19.0948, lng: 74.7480 },
  'akola': { lat: 20.7002, lng: 77.0082 },
  'amravati': { lat: 20.9320, lng: 77.7523 },
  'chandrapur': { lat: 19.9615, lng: 79.2961 },
  'dhule': { lat: 20.9042, lng: 74.7749 },
  'jalgaon': { lat: 21.0077, lng: 75.5626 },
  'latur': { lat: 18.4088, lng: 76.5604 },
  'nanded': { lat: 19.1383, lng: 77.3210 },
  'parbhani': { lat: 19.2704, lng: 76.7603 },
  'ratnagiri': { lat: 16.9902, lng: 73.3120 },
  'wardha': { lat: 20.7453, lng: 78.6022 },
  'yavatmal': { lat: 20.3899, lng: 78.1307 },
  'navi mumbai': { lat: 19.0330, lng: 73.0297 },
  'kalyan': { lat: 19.2437, lng: 73.1355 },
  'dombivli': { lat: 19.2183, lng: 73.0867 },
  'vasai': { lat: 19.3919, lng: 72.8397 },
  'virar': { lat: 19.4559, lng: 72.8111 },
  'panvel': { lat: 18.9894, lng: 73.1175 },
  'bhiwandi': { lat: 19.2967, lng: 73.0631 },
  'ulhasnagar': { lat: 19.2215, lng: 73.1645 },
  'shirdi': { lat: 19.7668, lng: 74.4771 },
  'lonavala': { lat: 18.7546, lng: 73.4062 },

  // ═══════════════════════════════════════════════════════════
  // TAMIL NADU
  // ═══════════════════════════════════════════════════════════
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'madurai': { lat: 9.9252, lng: 78.1198 },
  'salem': { lat: 11.6643, lng: 78.1460 },
  'tiruchirappalli': { lat: 10.7905, lng: 78.7047 },
  'trichy': { lat: 10.7905, lng: 78.7047 },
  'tirunelveli': { lat: 8.7139, lng: 77.7567 },
  'tiruppur': { lat: 11.1085, lng: 77.3411 },
  'erode': { lat: 11.3410, lng: 77.7172 },
  'vellore': { lat: 12.9165, lng: 79.1325 },
  'thoothukudi': { lat: 8.7642, lng: 78.1348 },
  'tuticorin': { lat: 8.7642, lng: 78.1348 },
  'dindigul': { lat: 10.3673, lng: 77.9803 },
  'thanjavur': { lat: 10.7870, lng: 79.1378 },
  'nagercoil': { lat: 8.1833, lng: 77.4119 },
  'kanchipuram': { lat: 12.8342, lng: 79.7036 },
  'hosur': { lat: 12.7409, lng: 77.8253 },
  'ooty': { lat: 11.4102, lng: 76.6950 },
  'kodaikanal': { lat: 10.2381, lng: 77.4892 },
  'kanyakumari': { lat: 8.0883, lng: 77.5385 },

  // ═══════════════════════════════════════════════════════════
  // KARNATAKA
  // ═══════════════════════════════════════════════════════════
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'mysore': { lat: 12.2958, lng: 76.6394 },
  'mysuru': { lat: 12.2958, lng: 76.6394 },
  'hubli': { lat: 15.3647, lng: 75.1240 },
  'dharwad': { lat: 15.4589, lng: 75.0078 },
  'mangalore': { lat: 12.9141, lng: 74.8560 },
  'mangaluru': { lat: 12.9141, lng: 74.8560 },
  'belgaum': { lat: 15.8497, lng: 74.4977 },
  'belagavi': { lat: 15.8497, lng: 74.4977 },
  'gulbarga': { lat: 17.3297, lng: 76.8343 },
  'kalaburagi': { lat: 17.3297, lng: 76.8343 },
  'davanagere': { lat: 14.4644, lng: 75.9218 },
  'bellary': { lat: 15.1394, lng: 76.9214 },
  'ballari': { lat: 15.1394, lng: 76.9214 },
  'shimoga': { lat: 13.9299, lng: 75.5681 },
  'tumkur': { lat: 13.3392, lng: 77.1017 },
  'raichur': { lat: 16.2076, lng: 77.3463 },
  'bidar': { lat: 17.9104, lng: 77.5199 },
  'hassan': { lat: 13.0072, lng: 76.1004 },
  'udupi': { lat: 13.3409, lng: 74.7421 },
  'chikmagalur': { lat: 13.3161, lng: 75.7720 },
  'mandya': { lat: 12.5218, lng: 76.8951 },
  'bijapur': { lat: 16.8302, lng: 75.7100 },
  'vijayapura': { lat: 16.8302, lng: 75.7100 },

  // ═══════════════════════════════════════════════════════════
  // ANDHRA PRADESH
  // ═══════════════════════════════════════════════════════════
  'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'vizag': { lat: 17.6868, lng: 83.2185 },
  'vijayawada': { lat: 16.5062, lng: 80.6480 },
  'guntur': { lat: 16.3067, lng: 80.4365 },
  'nellore': { lat: 14.4426, lng: 79.9865 },
  'kurnool': { lat: 15.8281, lng: 78.0373 },
  'rajahmundry': { lat: 17.0005, lng: 81.8040 },
  'kakinada': { lat: 16.9891, lng: 82.2475 },
  'tirupati': { lat: 13.6288, lng: 79.4192 },
  'anantapur': { lat: 14.6819, lng: 77.6006 },
  'kadapa': { lat: 14.4674, lng: 78.8241 },
  'eluru': { lat: 16.7107, lng: 81.0952 },
  'ongole': { lat: 15.5057, lng: 80.0499 },
  'nandyal': { lat: 15.4786, lng: 78.4836 },
  'chittoor': { lat: 13.2172, lng: 79.1003 },
  'hindupur': { lat: 13.8298, lng: 77.4930 },
  'amaravati': { lat: 16.5062, lng: 80.5150 },
  'srikakulam': { lat: 18.2949, lng: 83.8938 },
  'vizianagaram': { lat: 18.1067, lng: 83.3956 },

  // ═══════════════════════════════════════════════════════════
  // TELANGANA
  // ═══════════════════════════════════════════════════════════
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'secunderabad': { lat: 17.4399, lng: 78.4983 },
  'warangal': { lat: 17.9784, lng: 79.5941 },
  'nizamabad': { lat: 18.6725, lng: 78.0941 },
  'karimnagar': { lat: 18.4386, lng: 79.1288 },
  'khammam': { lat: 17.2473, lng: 80.1514 },
  'mahbubnagar': { lat: 16.7488, lng: 77.9855 },
  'nalgonda': { lat: 17.0575, lng: 79.2690 },
  'adilabad': { lat: 19.6641, lng: 78.5320 },
  'medak': { lat: 18.0530, lng: 78.2620 },
  'rangareddy': { lat: 17.2543, lng: 78.1926 },
  'suryapet': { lat: 17.1371, lng: 79.6267 },
  'siddipet': { lat: 18.1018, lng: 78.8520 },
  'mancherial': { lat: 18.8706, lng: 79.4439 },
  'ramagundam': { lat: 18.7556, lng: 79.4922 },

  // ═══════════════════════════════════════════════════════════
  // RAJASTHAN
  // ═══════════════════════════════════════════════════════════
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'jodhpur': { lat: 26.2389, lng: 73.0243 },
  'udaipur': { lat: 24.5854, lng: 73.7125 },
  'kota': { lat: 25.2138, lng: 75.8648 },
  'ajmer': { lat: 26.4499, lng: 74.6399 },
  'bikaner': { lat: 28.0229, lng: 73.3119 },
  'alwar': { lat: 27.5530, lng: 76.6346 },
  'bhilwara': { lat: 25.3407, lng: 74.6313 },
  'sikar': { lat: 27.6094, lng: 75.1398 },
  'pali': { lat: 25.7711, lng: 73.3234 },
  'bharatpur': { lat: 27.2152, lng: 77.5030 },
  'chittorgarh': { lat: 24.8887, lng: 74.6269 },
  'jaisalmer': { lat: 26.9157, lng: 70.9083 },
  'pushkar': { lat: 26.4899, lng: 74.5509 },
  'mount abu': { lat: 24.5926, lng: 72.7156 },

  // ═══════════════════════════════════════════════════════════
  // DELHI NCR
  // ═══════════════════════════════════════════════════════════
  'gurgaon': { lat: 28.4595, lng: 77.0266 },
  'gurugram': { lat: 28.4595, lng: 77.0266 },
  'noida': { lat: 28.5355, lng: 77.3910 },
  'faridabad': { lat: 28.4089, lng: 77.3178 },
  'ghaziabad': { lat: 28.6692, lng: 77.4538 },
  'greater noida': { lat: 28.4744, lng: 77.5040 },
  'manesar': { lat: 28.3549, lng: 76.9349 },
  'sonipat': { lat: 28.9288, lng: 77.0913 },
  'panipat': { lat: 29.3909, lng: 76.9635 },
  'rohtak': { lat: 28.8955, lng: 76.6066 },

  // ═══════════════════════════════════════════════════════════
  // UTTAR PRADESH
  // ═══════════════════════════════════════════════════════════
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'allahabad': { lat: 25.4358, lng: 81.8463 },
  'prayagraj': { lat: 25.4358, lng: 81.8463 },
  'meerut': { lat: 28.9845, lng: 77.7064 },
  'aligarh': { lat: 27.8974, lng: 78.0880 },
  'bareilly': { lat: 28.3670, lng: 79.4304 },
  'moradabad': { lat: 28.8389, lng: 78.7768 },
  'gorakhpur': { lat: 26.7606, lng: 83.3732 },
  'saharanpur': { lat: 29.9680, lng: 77.5510 },
  'mathura': { lat: 27.4924, lng: 77.6737 },
  'jhansi': { lat: 25.4484, lng: 78.5685 },
  'ayodhya': { lat: 26.7922, lng: 82.1998 },

  // ═══════════════════════════════════════════════════════════
  // MADHYA PRADESH
  // ═══════════════════════════════════════════════════════════
  'indore': { lat: 22.7196, lng: 75.8577 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'gwalior': { lat: 26.2183, lng: 78.1828 },
  'jabalpur': { lat: 23.1815, lng: 79.9864 },
  'ujjain': { lat: 23.1765, lng: 75.7885 },
  'sagar': { lat: 23.8388, lng: 78.7378 },
  'dewas': { lat: 22.9676, lng: 76.0534 },
  'satna': { lat: 24.6005, lng: 80.8322 },
  'ratlam': { lat: 23.3340, lng: 75.0376 },
  'rewa': { lat: 24.5362, lng: 81.2940 },

  // ═══════════════════════════════════════════════════════════
  // WEST BENGAL
  // ═══════════════════════════════════════════════════════════
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'calcutta': { lat: 22.5726, lng: 88.3639 },
  'howrah': { lat: 22.5958, lng: 88.2636 },
  'asansol': { lat: 23.6739, lng: 86.9524 },
  'siliguri': { lat: 26.7271, lng: 88.3953 },
  'durgapur': { lat: 23.5204, lng: 87.3119 },
  'darjeeling': { lat: 27.0360, lng: 88.2627 },
  'kharagpur': { lat: 22.3460, lng: 87.2320 },
  'haldia': { lat: 22.0667, lng: 88.0698 },

  // ═══════════════════════════════════════════════════════════
  // BIHAR
  // ═══════════════════════════════════════════════════════════
  'patna': { lat: 25.5941, lng: 85.1376 },
  'gaya': { lat: 24.7914, lng: 85.0002 },
  'bhagalpur': { lat: 25.2425, lng: 86.9842 },
  'muzaffarpur': { lat: 26.1225, lng: 85.3906 },
  'darbhanga': { lat: 26.1542, lng: 85.8918 },
  'purnia': { lat: 25.7771, lng: 87.4753 },

  // ═══════════════════════════════════════════════════════════
  // JHARKHAND
  // ═══════════════════════════════════════════════════════════
  'ranchi': { lat: 23.3441, lng: 85.3096 },
  'jamshedpur': { lat: 22.8046, lng: 86.2029 },
  'dhanbad': { lat: 23.7957, lng: 86.4304 },
  'bokaro': { lat: 23.6693, lng: 86.1511 },
  'hazaribagh': { lat: 23.9966, lng: 85.3613 },
  'deoghar': { lat: 24.4764, lng: 86.6916 },

  // ═══════════════════════════════════════════════════════════
  // ODISHA
  // ═══════════════════════════════════════════════════════════
  'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
  'cuttack': { lat: 20.4625, lng: 85.8830 },
  'rourkela': { lat: 22.2604, lng: 84.8536 },
  'puri': { lat: 19.8135, lng: 85.8312 },
  'sambalpur': { lat: 21.4669, lng: 83.9756 },

  // ═══════════════════════════════════════════════════════════
  // KERALA
  // ═══════════════════════════════════════════════════════════
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'cochin': { lat: 9.9312, lng: 76.2673 },
  'ernakulam': { lat: 9.9816, lng: 76.2999 },
  'trivandrum': { lat: 8.5241, lng: 76.9366 },
  'thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
  'kozhikode': { lat: 11.2588, lng: 75.7804 },
  'calicut': { lat: 11.2588, lng: 75.7804 },
  'thrissur': { lat: 10.5276, lng: 76.2144 },
  'kollam': { lat: 8.8932, lng: 76.6141 },
  'kannur': { lat: 11.8745, lng: 75.3704 },
  'alappuzha': { lat: 9.4981, lng: 76.3388 },
  'alleppey': { lat: 9.4981, lng: 76.3388 },
  'kottayam': { lat: 9.5916, lng: 76.5222 },
  'munnar': { lat: 10.0889, lng: 77.0595 },

  // ═══════════════════════════════════════════════════════════
  // PUNJAB
  // ═══════════════════════════════════════════════════════════
  'ludhiana': { lat: 30.9010, lng: 75.8573 },
  'amritsar': { lat: 31.6340, lng: 74.8723 },
  'jalandhar': { lat: 31.3260, lng: 75.5762 },
  'patiala': { lat: 30.3398, lng: 76.3869 },
  'bathinda': { lat: 30.2110, lng: 74.9455 },
  'pathankot': { lat: 32.2746, lng: 75.6421 },
  'mohali': { lat: 30.7046, lng: 76.7179 },

  // ═══════════════════════════════════════════════════════════
  // HARYANA
  // ═══════════════════════════════════════════════════════════
  'ambala': { lat: 30.3782, lng: 76.7767 },
  'karnal': { lat: 29.6857, lng: 76.9905 },
  'hisar': { lat: 29.1492, lng: 75.7217 },
  'yamunanagar': { lat: 30.1290, lng: 77.2674 },
  'bhiwani': { lat: 28.7930, lng: 76.1322 },
  'kurukshetra': { lat: 29.9695, lng: 76.8783 },
  'rewari': { lat: 28.1970, lng: 76.6189 },
  'panchkula': { lat: 30.6942, lng: 76.8606 },

  // ═══════════════════════════════════════════════════════════
  // CHHATTISGARH
  // ═══════════════════════════════════════════════════════════
  'raipur': { lat: 21.2514, lng: 81.6296 },
  'bhilai': { lat: 21.2094, lng: 81.4285 },
  'bilaspur': { lat: 22.0796, lng: 82.1391 },
  'korba': { lat: 22.3595, lng: 82.7501 },
  'durg': { lat: 21.1904, lng: 81.2849 },

  // ═══════════════════════════════════════════════════════════
  // ASSAM & NORTH EAST
  // ═══════════════════════════════════════════════════════════
  'guwahati': { lat: 26.1445, lng: 91.7362 },
  'silchar': { lat: 24.8333, lng: 92.7789 },
  'dibrugarh': { lat: 27.4728, lng: 94.9120 },
  'jorhat': { lat: 26.7509, lng: 94.2037 },
  'tezpur': { lat: 26.6338, lng: 92.8007 },
  'agartala': { lat: 23.8315, lng: 91.2868 },
  'imphal': { lat: 24.8170, lng: 93.9368 },
  'shillong': { lat: 25.5788, lng: 91.8933 },
  'aizawl': { lat: 23.7271, lng: 92.7176 },
  'kohima': { lat: 25.6586, lng: 94.1086 },
  'dimapur': { lat: 25.9063, lng: 93.7273 },
  'itanagar': { lat: 27.0844, lng: 93.6053 },
  'gangtok': { lat: 27.3389, lng: 88.6065 },

  // ═══════════════════════════════════════════════════════════
  // UTTARAKHAND
  // ═══════════════════════════════════════════════════════════
  'dehradun': { lat: 30.3165, lng: 78.0322 },
  'haridwar': { lat: 29.9457, lng: 78.1642 },
  'rishikesh': { lat: 30.0869, lng: 78.2676 },
  'roorkee': { lat: 29.8543, lng: 77.8880 },
  'haldwani': { lat: 29.2183, lng: 79.5130 },
  'nainital': { lat: 29.3919, lng: 79.4542 },
  'mussoorie': { lat: 30.4598, lng: 78.0644 },

  // ═══════════════════════════════════════════════════════════
  // HIMACHAL PRADESH
  // ═══════════════════════════════════════════════════════════
  'shimla': { lat: 31.1048, lng: 77.1734 },
  'manali': { lat: 32.2396, lng: 77.1887 },
  'dharamshala': { lat: 32.2190, lng: 76.3234 },
  'kullu': { lat: 31.9592, lng: 77.1089 },
  'solan': { lat: 30.9045, lng: 77.0967 },
  'mandi': { lat: 31.7087, lng: 76.9318 },
  'dalhousie': { lat: 32.5387, lng: 75.9706 },
  'kasauli': { lat: 30.8980, lng: 76.9656 },

  // ═══════════════════════════════════════════════════════════
  // JAMMU & KASHMIR
  // ═══════════════════════════════════════════════════════════
  'srinagar': { lat: 34.0837, lng: 74.7973 },
  'jammu': { lat: 32.7266, lng: 74.8570 },
  'leh': { lat: 34.1526, lng: 77.5771 },
  'kargil': { lat: 34.5539, lng: 76.1349 },
  'gulmarg': { lat: 34.0484, lng: 74.3805 },
  'pahalgam': { lat: 34.0161, lng: 75.3150 },
  'sonamarg': { lat: 34.3000, lng: 75.2833 },
};

// ═══════════════════════════════════════════════════════════
// CACHE FOR API RESULTS
// ═══════════════════════════════════════════════════════════

const geocodeCache: Record<string, { lat: number; lng: number } | null> = {};

// ═══════════════════════════════════════════════════════════
// SYNC FUNCTION - Local DB Only (for immediate use)
// ═══════════════════════════════════════════════════════════

export function getCityCoordinates(cityName: string): { lat: number; lng: number } | null {
  if (!cityName) return null;
  
  // Normalize: lowercase, trim, remove extra spaces
  const normalized = cityName.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Check cache first
  if (geocodeCache[normalized] !== undefined) {
    return geocodeCache[normalized];
  }
  
  // Direct match
  if (CITY_COORDINATES[normalized]) {
    return CITY_COORDINATES[normalized];
  }
  
  // Partial match - check if any key contains our search or vice versa
  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    if (normalized.includes(city) || city.includes(normalized)) {
      return coords;
    }
  }
  
  // Try without common suffixes
  const withoutSuffix = normalized
    .replace(/(city|town|nagar|pur|pura|bad|abad|garh|ganj|wala|wadi|pet|peta|patnam|puram|district|dist)$/i, '')
    .trim();
  
  if (withoutSuffix && withoutSuffix !== normalized) {
    if (CITY_COORDINATES[withoutSuffix]) {
      return CITY_COORDINATES[withoutSuffix];
    }
    
    // Check partial on cleaned name
    for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
      if (withoutSuffix.includes(city) || city.includes(withoutSuffix)) {
        return coords;
      }
    }
  }
  
  // Try first word only (e.g., "Valsad District" → "Valsad")
  const firstWord = normalized.split(' ')[0];
  if (firstWord && CITY_COORDINATES[firstWord]) {
    return CITY_COORDINATES[firstWord];
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════
// ASYNC FUNCTION - Local DB + Google Places API Fallback
// ═══════════════════════════════════════════════════════════

export async function getCityCoordinatesAsync(
  cityName: string
): Promise<{ lat: number; lng: number } | null> {
  if (!cityName) return null;
  
  const normalized = cityName.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Check cache first
  if (geocodeCache[normalized] !== undefined) {
    console.log(`📍 Cache hit for: ${cityName}`);
    return geocodeCache[normalized];
  }
  
  // Try local database first
  const localResult = getCityCoordinates(cityName);
  if (localResult) {
    console.log(`📍 Local DB hit for: ${cityName}`);
    geocodeCache[normalized] = localResult;
    return localResult;
  }
  
  // Fallback to Google Places API
  console.log(`🌐 API lookup for: ${cityName}`);
  
  try {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ Google Places API key not configured');
      geocodeCache[normalized] = null;
      return null;
    }
    
    // Use Google Places Autocomplete to find the place
    const autocompleteResponse = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
        },
        body: JSON.stringify({
          input: `${cityName}, India`,
          includedRegionCodes: ['in'],
          languageCode: 'en',
        }),
      }
    );
    
    if (!autocompleteResponse.ok) {
      throw new Error(`Autocomplete API error: ${autocompleteResponse.status}`);
    }
    
    const autocompleteData = await autocompleteResponse.json();
    
    if (!autocompleteData.suggestions || autocompleteData.suggestions.length === 0) {
      console.warn(`⚠️ No results for: ${cityName}`);
      geocodeCache[normalized] = null;
      return null;
    }
    
    const placeId = autocompleteData.suggestions[0].placePrediction.placeId;
    
    // Get place details with coordinates
    const detailsResponse = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'location',
        },
      }
    );
    
    if (!detailsResponse.ok) {
      throw new Error(`Details API error: ${detailsResponse.status}`);
    }
    
    const detailsData = await detailsResponse.json();
    
    if (detailsData.location) {
      const result = {
        lat: detailsData.location.latitude,
        lng: detailsData.location.longitude,
      };
      
      console.log(`✅ API found: ${cityName} →`, result);
      geocodeCache[normalized] = result;
      return result;
    }
    
    geocodeCache[normalized] = null;
    return null;
    
  } catch (error) {
    console.error(`❌ Geocoding error for ${cityName}:`, error);
    geocodeCache[normalized] = null;
    return null;
  }
}