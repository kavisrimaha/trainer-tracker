// Data structure for hubs and spokes
const locationData = {
      'Zone XII : Ariyalur': {
        'Hub 1 (SRM TRP ENGINEERING COLLEGE)': {
          colleges: ['SRM TRP ENGINEERING COLLEGE'],
          spokes: { 'Spoke 1': [] }
        },
        'Hub 2 (ROEVER ENGINEERING COLLEGE)': {
          colleges: ['ROEVER ENGINEERING COLLEGE'],
          spokes: {
            'Spoke 2': [
              'DR.NAVALAR NEDUNCHEZHIYAN COLLEGE OF ENGINEERING',
              'SRI RAMAKRISHNA COLLEGE OF ENGINEERING'
            ]
          }
        },
        'Hub 3 (UNIVERSITY COLLEGE OF ENGINEERING, ARIYALUR)': {
          colleges: ['UNIVERSITY COLLEGE OF ENGINEERING, ARIYALUR'],
          spokes: {
            'Spoke 3': [
              'MEENAKSHI RAMASWAMY ENGINEERING COLLEGE',
              'NELLIANDAVAR INSTITUTE OF TECHNOLOGY'
            ]
          }
        },
        'Hub 4 (M.A.M College of Engineering)': {
          colleges: ['M.A.M College of Engineering'],
          spokes: {
            'Spoke 4': ['M.A.M College of Engineering']
          }
        },
        'Hub 5 (M.A.M. COLLEGE OF ENGINEERING AND TECHNOLOGY)': {
          colleges: ['M.A.M. COLLEGE OF ENGINEERING AND TECHNOLOGY'],
          spokes: {
            'Spoke 5': ['TRICHY ENGINEERING COLLEGE']
          }
        }
      }
    };
  const zoneSelect = document.getElementById('zone_name');
    const hubSelect = document.getElementById('hub_name');
    const spokeSelect = document.getElementById('spoke_name');

    // When zone changes, populate hubs
    zoneSelect.addEventListener('change', function() {
      hubSelect.innerHTML = '<option value="">-- Select Hub --</option>';
      spokeSelect.innerHTML = '<option value="">-- Select Spoke/College --</option>';

      const hubs = locationData[this.value];
      if (hubs) {
        Object.keys(hubs).forEach(hub => {
          const opt = document.createElement('option');
          opt.value = hub;
          opt.textContent = hub;
          hubSelect.appendChild(opt);
        });
      }
    });

    // When hub changes, populate spokes and colleges
    hubSelect.addEventListener('change', function() {
      spokeSelect.innerHTML = '<option value="">-- Select Spoke/College --</option>';

      const zone = zoneSelect.value;
      const hub = hubSelect.value;
      const hubData = locationData[zone][hub];

      if (hubData) {
        // Add hub colleges
        hubData.colleges.forEach(college => {
          const opt = document.createElement('option');
          opt.value = college;
          opt.textContent = `Hub College: ${college}`;
          spokeSelect.appendChild(opt);
        });

        // Add spokes + their colleges
        Object.keys(hubData.spokes).forEach(spoke => {
          const spokeColleges = hubData.spokes[spoke];
          if (spokeColleges.length > 0) {
            spokeColleges.forEach(college => {
              const opt = document.createElement('option');
              opt.value = college;
              opt.textContent = `${spoke} - ${college}`;
              spokeSelect.appendChild(opt);
            });
          } else {
            const opt = document.createElement('option');
            opt.value = spoke;
            opt.textContent = `${spoke} (no colleges)`;
            spokeSelect.appendChild(opt);
          }
        });
      }
    });