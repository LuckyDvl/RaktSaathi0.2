// public/js/script.js

// Expanded mapping of Indian states and their districts
const stateDistrictMapping = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Sri Potti Sriramulu Nellore", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kushinagar", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Thane", "Kalyan", "Navi Mumbai", "Amravati"],
  // Add other states as needed
};

// Initialize the filter UI: populate state and district dropdowns and attach events
function initFilterUI() {
  const stateSelect = document.getElementById('stateSelect');
  const districtSelect = document.getElementById('districtSelect');
  
  // Populate states
  stateSelect.innerHTML = '<option value="">Select State</option>';
  for (const state in stateDistrictMapping) {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
  }
  
  // On state change, populate district
  stateSelect.addEventListener('change', function() {
    const selectedState = this.value;
    districtSelect.innerHTML = '<option value="">Select District</option>';
    if (stateDistrictMapping[selectedState]) {
      stateDistrictMapping[selectedState].forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
      });
    }
  });
  
  // Filter form submit
  document.getElementById('filterForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const selectedState = stateSelect.value;
    const selectedDistrict = districtSelect.value;
    applyFilter(selectedState, selectedDistrict);
  });
}

// Apply filter by reloading donors and blood requests
function applyFilter(filterState, filterDistrict) {
  loadDonors(filterState, filterDistrict);
  loadBloodRequests(filterState, filterDistrict);
}

// Helper: build address string
function formatAddress(addr) {
  if (!addr) return '';
  const parts = [];
  if (addr.street) parts.push(addr.street);
  if (addr.district) parts.push(addr.district);
  if (addr.state) parts.push(addr.state);
  if (addr.pinCode) parts.push(addr.pinCode);
  return parts.join(', ');
}

// Slide show logic for blood requests
const slideIndexMap = {};
function plusSlides(n, containerId) {
  showSlides(slideIndexMap[containerId] + n, containerId);
}
function showSlides(n, containerId) {
  const slides = document.querySelectorAll(`#${containerId} .mySlide`);
  if (!slideIndexMap[containerId]) slideIndexMap[containerId] = 0;
  if (n >= slides.length) n = 0;
  if (n < 0) n = slides.length - 1;
  slideIndexMap[containerId] = n;
  slides.forEach((slide, i) => {
    slide.style.display = (i === n) ? 'block' : 'none';
  });
}

// Load donors; display them in a card layout with circular profile pic
function loadDonors(filterState, filterDistrict) {
  fetch('/api/donors')
    .then(response => response.json())
    .then(donors => {
      if (filterState && filterDistrict) {
        donors = donors.filter(donor =>
          donor.address &&
          donor.address.state === filterState &&
          donor.address.district === filterDistrict
        );
      }
      let output = '<div class="donor-cards-container">';
      if (donors.length === 0) {
        output += '<p>No donors registered.</p>';
      } else {
        donors.forEach(donor => {
          const addressStr = donor.address ? formatAddress(donor.address) : '';
          output += `
            <div class="donor-card">
              <div class="donor-pic-wrapper">
                ${donor.profilePic 
                  ? `<img src="${donor.profilePic}" alt="Profile Pic" class="profile-pic-circle">`
                  : `<img src="https://via.placeholder.com/100?text=No+Pic" alt="No Pic" class="profile-pic-circle">`
                }
              </div>
              <h3 class="donor-name">${donor.name}</h3>
              <p class="donor-subtitle">${donor.bloodGroup} Blood Group</p>
              <p class="donor-info"><strong>Age:</strong> ${donor.age}</p>
              <p class="donor-info"><strong>Gender:</strong> ${donor.gender}</p>
              <p class="donor-info"><strong>Address:</strong> ${addressStr}</p>
              <p class="donor-info"><strong>Previously Donated:</strong> ${donor.previouslyDonated}</p>
              <p class="donor-info"><strong>Health Issues:</strong> ${donor.healthIssues || "None"}</p>
            </div>
          `;
        });
      }
      output += '</div>';
      document.getElementById('donorList').innerHTML = output;
    })
    .catch(error => {
      console.error("Error fetching donors:", error);
      document.getElementById('donorList').innerText = "Error loading donors.";
    });
}

// Load blood requests
function loadBloodRequests(filterState, filterDistrict) {
  fetch('/api/requests')
    .then(response => response.json())
    .then(requests => {
      if (filterState && filterDistrict) {
        requests = requests.filter(request =>
          request.address &&
          request.address.state === filterState &&
          request.address.district === filterDistrict
        );
      }
      let output = '<ul>';
      if (requests.length === 0) {
        output += '<li>No blood requests available.</li>';
      } else {
        requests.forEach(request => {
          const addressStr = request.address ? formatAddress(request.address) : '';
          
          // Build slideshow HTML for reports images and video
          let slideshowHtml = '';
          if (request.reportsImages && request.reportsImages.length > 0) {
            request.reportsImages.forEach((img, idx) => {
              slideshowHtml += `
                <div class="mySlide" style="display:${idx === 0 ? 'block' : 'none'};">
                  <img src="${img}" alt="Report Image">
                </div>
              `;
            });
          }
          if (request.video) {
            const showFirst = (!request.reportsImages || request.reportsImages.length === 0) ? 'block' : 'none';
            slideshowHtml += `
              <div class="mySlide" style="display:${showFirst};">
                <video src="${request.video}" controls></video>
              </div>
            `;
          }
          let slideshowContainer = '';
          if (slideshowHtml) {
            const containerId = `slideshow-${request.id}`;
            slideIndexMap[containerId] = 0;
            slideshowContainer = `
              <div id="${containerId}" class="slideshow-container">
                ${slideshowHtml}
                <a class="prev" onclick="plusSlides(-1, '${containerId}')">&#10094;</a>
                <a class="next" onclick="plusSlides(1, '${containerId}')">&#10095;</a>
              </div>
            `;
          }
          
          output += `
            <li>
              <strong>Name:</strong> ${request.name}<br>
              <strong>Age:</strong> ${request.age}<br>
              <strong>Gender:</strong> ${request.gender}<br>
              <strong>Mobile:</strong> ${request.mobile}<br>
              <strong>Blood Group:</strong> ${request.bloodGroup}<br>
              ${addressStr ? `<strong>Address:</strong> ${addressStr}<br>` : ''}
              ${request.emergency ? `<strong>Emergency:</strong> ${request.emergency}<br>` : ''}
              ${slideshowContainer}
            </li>
          `;
        });
      }
      output += '</ul>';
      document.getElementById('requestList').innerHTML = output;
    })
    .catch(error => {
      console.error("Error fetching blood requests:", error);
      document.getElementById('requestList').innerText = "Error loading blood requests.";
    });
}

// Initialize filter UI and optionally load data
initFilterUI();
// loadDonors(); // Uncomment if you want to load donors immediately
// loadBloodRequests(); // Uncomment if you want to load requests immediately
