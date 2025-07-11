document.addEventListener('DOMContentLoaded', () => {
    // 1. กำหนดค่าเริ่มต้นและตัวแปรที่จำเป็น
    AOS.init({
        duration: 1000,
        once: true,
    });

    let donations = []; // เริ่มต้นด้วย Array ว่างเปล่า จะไปโหลดมาจาก Google Sheet แทน

    const totalAmountSpan = document.getElementById('totalAmount');
    const donateForm = document.getElementById('donateForm');
    const donorsTableBody = document.querySelector('#donorsTable tbody');
    const certificateModal = document.getElementById('certificateModal');
    const closeButton = document.querySelector('.close-button');
    const certificateCanvas = document.getElementById('certificateCanvas');
    const downloadPngBtn = document.getElementById('downloadPng');
    const downloadPdfBtn = document.getElementById('downloadPdf');
    const printCertBtn = document.getElementById('printCert');
    const sendSlipLineBtn = document.getElementById('sendSlipLine');

    // *** URL ของ Web App ที่ได้จาก Google Apps Script ***
    const GOOGLE_SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzJ9Lph3QjJjx1KJA9l4SJdHKdxHM0JV-J9uHas9bMGgzSNiR1odQgqaZqeKEMiuynX/exec'; 

    // 2. ฟังก์ชันช่วยงาน (Helper Functions)
    function updateTotalAmount() {
        const total = donations.reduce((sum, d) => sum + d.amount, 0);
        totalAmountSpan.textContent = total.toLocaleString(); // แสดงผลตัวเลขแบบมีคอมม่า
    }

    let dataTable; // ตัวแปรสำหรับ DataTable
    function renderDonorsTable() {
        if (dataTable) {
            dataTable.destroy(); // ลบ DataTable เก่าทิ้งก่อนสร้างใหม่
        }
        donorsTableBody.innerHTML = ''; // เคลียร์ตารางเก่า

        // เรียงข้อมูลบริจาคจากล่าสุดไปเก่าสุด
        const sortedDonations = [...donations].sort((a, b) => {
            // ปรับการแปลงวันที่ให้ถูกต้อง เพื่อการเรียงลำดับ
            const dateA = new Date(a.date.replace(/(\d+)\s(\S+)\s(\d+)/, '$2 $1, $3').replace('กรกฎาคม', 'July').replace('มิถุนายน', 'June').replace('พฤษภาคม', 'May').replace('เมษายน', 'April').replace('มีนาคม', 'March').replace('กุมภาพันธ์', 'February').replace('มกราคม', 'January').replace('ธันวาคม', 'December').replace('พฤศจิกายน', 'November').replace('ตุลาคม', 'October').replace('กันยายน', 'September').replace('สิงหาคม', 'August'));
            const dateB = new Date(b.date.replace(/(\d+)\s(\S+)\s(\d+)/, '$2 $1, $3').replace('กรกฎาคม', 'July').replace('มิถุนายน', 'June').replace('พฤษภาคม', 'May').replace('เมษายน', 'April').replace('มีนาคม', 'March').replace('กุมภาพันธ์', 'February').replace('มกราคม', 'January').replace('ธันวาคม', 'December').replace('พฤศจิกายน', 'November').replace('ตุลาคม', 'October').replace('กันยายน', 'September').replace('สิงหาคม', 'August'));
            return dateB - dateA;
        });
        
        sortedDonations.forEach((d, index) => {
            const row = donorsTableBody.insertRow();
            row.insertCell(0).textContent = index + 1; // ลำดับ
            row.insertCell(1).textContent = d.name; // ชื่อ-นามสกุล
            row.insertCell(2).textContent = d.province; // จังหวัด
            row.insertCell(3).textContent = d.amount.toLocaleString(); // จำนวนเงิน
            row.insertCell(4).textContent = d.date; // วันที่บริจาค
        });

        dataTable = $('#donorsTable').DataTable({
            "pagingType": "simple_numbers", // รูปแบบ pagination
            "pageLength": 10, // แสดง 10 รายชื่อต่อหน้า
            "searching": false, // ไม่แสดงช่องค้นหา
            "lengthChange": false, // ไม่ให้เปลี่ยนจำนวนรายการต่อหน้า
            "info": false, // ไม่แสดงข้อมูล "Showing 1 to 10 of X entries"
            "order": [] // ไม่มีการเรียงลำดับเริ่มต้น (เราเรียงเองแล้ว)
        });
    }

    // ฟังก์ชันสำหรับวาดเกียรติบัตรบน Canvas
    function drawCertificate(name, amount, date) {
        const ctx = certificateCanvas.getContext('2d');
        certificateCanvas.width = 800; // ขนาด Canvas ที่เหมาะสม (อัตราส่วน A4)
        certificateCanvas.height = 565;

        // พื้นหลังและขอบ
        ctx.fillStyle = '#FFFACD'; // สีครีม
        ctx.fillRect(0, 0, certificateCanvas.width, certificateCanvas.height);
        ctx.strokeStyle = '#DAA520'; // สีทอง
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, certificateCanvas.width - 10, certificateCanvas.height - 10);

        // โลโก้โรงเรียน
        const schoolLogo = new Image();
        schoolLogo.src = 'https://img5.pic.in.th/file/secure-sv1/22e3edfc06474f56734531af2780e6fb.jpg';
        schoolLogo.onload = () => {
            const logoWidth = 100;
            const logoHeight = (schoolLogo.height / schoolLogo.width) * logoWidth;
            ctx.drawImage(schoolLogo, (certificateCanvas.width - logoWidth) / 2, 50, logoWidth, logoHeight);

            // หัวข้อเกียรติบัตร
            ctx.font = 'bold 30px Sarabun';
            ctx.fillStyle = '#2C3E50'; // สีกรมท่าเข้ม
            ctx.textAlign = 'center';
            ctx.fillText('เกียรติบัตรขอขอบคุณ', certificateCanvas.width / 2, 50 + logoHeight + 30);

            // เนื้อหาหลักเกียรติบัตร
            ctx.font = '24px Sarabun';
            ctx.fillText(`ข้าพเจ้า ${name}`, certificateCanvas.width / 2, 50 + logoHeight + 100);
            ctx.fillText(`ได้บริจาคทำบุญสมทบทุนจัดซื้อ ป้ายวง และธง ให้กับวงเมโลเดียน`, certificateCanvas.width / 2, 50 + logoHeight + 140);
            ctx.fillText(`ร.ร.บ้านกุดขมิ้น อ.สูงเนิน จ.นครราชสีมา`, certificateCanvas.width / 2, 50 + logoHeight + 180);
            ctx.font = 'bold 26px Sarabun';
            ctx.fillText(`เป็นจำนวนเงิน ${amount.toLocaleString()} บาท`, certificateCanvas.width / 2, 50 + logoHeight + 220);
            ctx.font = '20px Sarabun';
            ctx.fillText(`ณ วันที่ ${date}`, certificateCanvas.width / 2, 50 + logoHeight + 260);

            // ข้อความขอบคุณด้านล่าง
            ctx.font = '18px Sarabun';
            ctx.fillStyle = '#2C3E50';
            ctx.fillText(`ขอขอบคุณในกุศลเจตนาอันเป็นมงคลยิ่ง`, certificateCanvas.width / 2, certificateCanvas.height - 70);
        };
    }

    // *** ฟังก์ชันเพื่อโหลดข้อมูลจาก Google Sheet เมื่อหน้าเว็บโหลด ***
    async function loadDonationsFromSheet() {
        try {
            // แสดง Loading Spinner ขณะโหลดข้อมูล
            Swal.fire({
                title: 'กำลังโหลดข้อมูลบริจาค...',
                text: 'กรุณารอสักครู่',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
                method: 'GET' // ใช้ GET เพื่อดึงข้อมูล
            });

            const result = await response.json();
            Swal.close(); // ปิด Loading Spinner

            if (result && result.data) {
                // *** สำคัญ: ปรับการแมปข้อมูลตรงนี้ ให้ตรงกับชื่อคอลัมน์ใน Google Sheet ของคุณ ***
                // ถ้าคุณใช้ชื่อคอลัมน์ใน Google Sheet เป็นภาษาอังกฤษ (FullName, Province, Amount, Date)
                donations = result.data.map(item => ({
                    name: item.FullName,  // ตรงกับ FullName ใน Sheet
                    province: item.Province, // ตรงกับ Province ใน Sheet
                    amount: parseInt(item.Amount), // แปลงเป็นตัวเลข
                    date: item.Date        // ตรงกับ Date ใน Sheet
                }));

                // ถ้าคุณใช้ชื่อคอลัมน์ใน Google Sheet เป็นภาษาไทย (เช่น 'ชื่อ - นามสกุล', 'จังหวัด', 'จำนวนเงินบริจาค', 'วันที่บริจาค')
                // ให้ใช้โค้ดนี้แทนโค้ดด้านบน แล้วคอมเมนต์โค้ดด้านบน
                /*
                donations = result.data.map(item => ({
                    name: item.ชื่อนามสกุล,  // 'ชื่อ - นามสกุล' ถูก Apps Script แปลงเป็น 'ชื่อนามสกุล'
                    province: item.จังหวัด,   // 'จังหวัด' ถูก Apps Script แปลงเป็น 'จังหวัด'
                    amount: parseInt(item.จำนวนเงินบริจาค), // 'จำนวนเงินบริจาค' ถูก Apps Script แปลงเป็น 'จำนวนเงินบริจาค'
                    date: item.วันที่บริจาค   // 'วันที่บริจาค' ถูก Apps Script แปลงเป็น 'วันที่บริจาค'
                }));
                */

                updateTotalAmount();
                renderDonorsTable();
            } else {
                console.error("Failed to load donations: ", result.message);
                Swal.fire({
                    icon: 'error',
                    title: 'โหลดข้อมูลไม่สำเร็จ',
                    text: result.message || 'ไม่สามารถดึงข้อมูลผู้บริจาคได้',
                    confirmButtonText: 'ตกลง'
                });
            }
        } catch (error) {
            console.error("Error loading donations from sheet:", error);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'ข้อผิดพลาดในการเชื่อมต่อ',
                text: 'ไม่สามารถโหลดข้อมูลบริจาคได้ โปรดตรวจสอบการเชื่อมต่อ',
                confirmButtonText: 'ตกลง'
            });
        }
    }

    // 3. จัดการเหตุการณ์ (Event Handlers)
    donateForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value.trim();
        const province = document.getElementById('province').value.trim();
        const amount = parseInt(document.getElementById('amount').value);

        if (!fullName || !province || isNaN(amount) || amount <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง',
                confirmButtonText: 'รับทราบ'
            });
            return;
        }

        const today = new Date();
        const formattedDate = `${today.getDate()} ${new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(today)}`;

        const newDonation = { // ข้อมูลสำหรับแสดงผลในตารางชั่วคราวบนเว็บทันที (อาจจะไม่ใช้แล้วถ้าโหลดจาก Sheet ตลอด)
            name: fullName,
            province: province,
            amount: amount,
            date: formattedDate
        };

        const formData = new FormData(); // ข้อมูลสำหรับส่งไป Google Sheet
        formData.append('FullName', fullName); // ชื่อคอลัมน์ใน Sheet (ตรงกับที่ตั้งใน Google Sheet)
        formData.append('Province', province);
        formData.append('Amount', amount);
        formData.append('Date', formattedDate);

        try {
            Swal.fire({
                title: 'กำลังส่งข้อมูล...',
                text: 'กรุณารอสักครู่',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.result === 'success') {
                // ถ้าส่งข้อมูลสำเร็จ
                // หลังจากส่งสำเร็จ ค่อยโหลดข้อมูลทั้งหมดใหม่จาก Sheet
                // เพื่อให้มั่นใจว่าข้อมูลในตารางหน้าเว็บตรงกับใน Sheet
                await loadDonationsFromSheet(); // โหลดข้อมูลล่าสุดทั้งหมด

                drawCertificate(fullName, amount, formattedDate);
                certificateModal.style.display = 'block';

                await Swal.fire({
                    icon: 'success',
                    title: 'ขอบคุณสำหรับการบริจาค!',
                    html: 'บุญครั้งนี้ขออานิสงส์จงดลบันดาลให้ท่านมีความสุขความเจริญ<br><br><b>กรุณาดาวน์โหลด/พิมพ์เกียรติบัตร และกดปุ่ม "ส่งสลิปผ่าน LINE" เพื่อแจ้งหลักฐานการบริจาค</b>',
                    showConfirmButton: true,
                    confirmButtonText: 'รับทราบ',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    focusConfirm: true
                });

                donateForm.reset(); // ล้างข้อมูลในฟอร์ม
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด!',
                    text: 'ไม่สามารถบันทึกข้อมูลได้: ' + data.message,
                    confirmButtonText: 'ตกลง'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ!',
                text: 'โปรดลองอีกครั้งในภายหลัง: ' + error.message,
                confirmButtonText: 'ตกลง'
            });
        }
    });

    closeButton.addEventListener('click', () => {
        certificateModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == certificateModal) {
            certificateModal.style.display = 'none';
        }
    });

    // เมื่อกดปุ่ม "ดาวน์โหลด PNG"
    downloadPngBtn.addEventListener('click', () => {
        const dataURL = certificateCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'เกียรติบัตร_ร่วมทำบุญ.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // เมื่อกดปุ่ม "ดาวน์โหลด PDF" (ยังไม่สมบูรณ์)
    downloadPdfBtn.addEventListener('click', async () => { // เปลี่ยนเป็น async เพื่อรอรูปภาพโหลด
        Swal.fire({
            title: 'กำลังสร้าง PDF...',
            text: 'กรุณารอสักครู่',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const dataURL = certificateCanvas.toDataURL('image/png'); // ได้ base64 ของรูปภาพจาก canvas

        // สร้าง Object Image เพื่อให้ jsPDF ใช้งานได้
        const img = new Image();
        img.src = dataURL;

        img.onload = () => {
            const { jsPDF } = window.jspdf; // เรียกใช้ jsPDF
            const doc = new jsPDF('landscape', 'px', 'a4'); // กำหนดขนาด A4 แนวนอน

            const imgWidth = doc.internal.pageSize.getWidth();
            const imgHeight = (img.height * imgWidth) / img.width; // คำนวณความสูงให้ได้อัตราส่วนเดิม

            doc.addImage(img, 'PNG', 0, 0, imgWidth, imgHeight); // เพิ่มรูปภาพลงใน PDF
            doc.save('เกียรติบัตร_ร่วมทำบุญ.pdf'); // ดาวน์โหลดไฟล์ PDF

            Swal.close(); // ปิด Loading Spinner
        };

        img.onerror = (error) => {
            console.error("Error loading image for PDF:", error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด!',
                text: 'ไม่สามารถสร้าง PDF ได้: ' + error.message,
                confirmButtonText: 'ตกลง'
            });
        };
    });

    // เมื่อกดปุ่ม "พิมพ์"
    printCertBtn.addEventListener('click', () => {
        const dataURL = certificateCanvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank', 'width=800,height=600'); // เปิดหน้าต่างใหม่สำหรับพิมพ์
        printWindow.document.write('<html><head><title>พิมพ์เกียรติบัตร</title></head><body>');
        printWindow.document.write('<img src="' + dataURL + '" style="max-width:100%; display: block; margin: 0 auto;">');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    });

    // เมื่อกดปุ่ม "ส่งสลิปผ่าน LINE"
    sendSlipLineBtn.addEventListener('click', () => {
        const lineLink = 'https://line.me/R/ti/g/QARgVer8XQ'; // ลิงก์ LINE Group
        window.open(lineLink, '_blank'); // เปิดในแท็บใหม่
        certificateModal.style.display = 'none'; // ปิด Modal เกียรติบัตร
    });

    // 4. การจัดการข้อมูลจังหวัด (ยังคงเหมือนเดิม)
    const provinces = [
        "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท",
        "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม", "นครราชสีมา",
        "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์",
        "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์",
        "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ระนอง", "ระยอง", "ราชบุรี", "ร้อยเอ็ด",
        "ลพบุรี", "เลย", "ลำปาง", "ลำพูน", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร",
        "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู",
        "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
    ];
    const provinceList = document.getElementById('provinceList');
    provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province;
        provinceList.appendChild(option);
    });

    // 5. เรียกใช้งานฟังก์ชันเริ่มต้นเมื่อโหลดหน้า
    // *** จุดที่ต้องแก้ไข ***
    // ต้องเรียก loadDonationsFromSheet() ที่นี่ เพื่อให้โหลดข้อมูลเมื่อหน้าเว็บเปิด
    loadDonationsFromSheet(); // <--- ต้องเป็นบรรทัดนี้แทน
    // updateTotalAmount(); // บรรทัดนี้จะถูกเรียกใน loadDonationsFromSheet()
    // renderDonorsTable(); // บรรทัดนี้จะถูกเรียกใน loadDonationsFromSheet()
});
