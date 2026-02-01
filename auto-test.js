/**
 * Automated System Test for توصيل ون WMS
 * 
 * HOW TO USE:
 * 1. Open the system at http://localhost:5173
 * 2. Open Browser Console (F12 > Console tab)
 * 3. Copy and paste this entire script
 * 4. Press Enter
 * 5. Read the test results
 */

(function () {
    console.clear();
    console.log('%c===========================================', 'color: #B70F32; font-size: 20px; font-weight: bold;');
    console.log('%c   اختبار نظام توصيل ون التلقائي   ', 'color: #B70F32; font-size: 20px; font-weight: bold;');
    console.log('%c===========================================', 'color: #B70F32; font-size: 20px; font-weight: bold;');
    console.log('\n');

    let passedTests = 0;
    let failedTests = 0;
    let totalTests = 0;

    function test(name, condition, expected) {
        totalTests++;
        if (condition) {
            console.log(`%c✅ PASS: ${name}`, 'color: green; font-weight: bold;');
            passedTests++;
            return true;
        } else {
            console.log(`%c❌ FAIL: ${name}`, 'color: red; font-weight: bold;');
            console.log(`   Expected: ${expected}`);
            failedTests++;
            return false;
        }
    }

    console.log('%c📋 اختبار 1: العلامة التجارية والعنوان', 'color: #B70F32; font-size: 16px; font-weight: bold;');
    console.log('─────────────────────────────────────────\n');

    // Test 1: Page Title
    test(
        'عنوان الصفحة',
        document.title.includes('توصيل ون') || document.title.includes('نظام ادارة المخزون'),
        'يجب أن يحتوي على "توصيل ون" أو "نظام ادارة المخزون"'
    );

    // Test 2: Company Name in Header
    const headerText = document.querySelector('h2')?.textContent || '';
    test(
        'عنوان الصفحة الرئيسية',
        headerText.includes('توصيل ون'),
        'يجب أن يحتوي على "توصيل ون"'
    );

    // Test 3: Sidebar Company Name
    const sidebarTitle = document.querySelector('.text-white.tracking-tight')?.textContent || '';
    test(
        'اسم الشركة في الشريط الجانبي',
        sidebarTitle.includes('توصيل'),
        'يجب أن يحتوي على "توصيل"'
    );

    console.log('\n%c🎨 اختبار 2: الألوان', 'color: #B70F32; font-size: 16px; font-weight: bold;');
    console.log('─────────────────────────────────────────\n');

    // Test 4: Check for blue colors (should not exist)
    const allElements = document.querySelectorAll('*');
    let blueElementsCount = 0;
    let redElementsCount = 0;

    allElements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const color = styles.color;

        // Check for blue (rgb values where blue > red and blue > green)
        if (bgColor.includes('rgb')) {
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb[2] > rgb[0] && rgb[2] > rgb[1] && rgb[2] > 100) {
                blueElementsCount++;
            }
        }

        // Check for red (our brand color)
        if (bgColor.includes('183, 15, 50') || bgColor.includes('#B70F32')) {
            redElementsCount++;
        }
    });

    test(
        'عدم وجود عناصر زرقاء',
        blueElementsCount < 5, // Allow very few blue elements (might be default browser styles)
        'يجب ألا يوجد عناصر زرقاء كثيرة'
    );

    test(
        'وجود عناصر حمراء بلون البراند',
        redElementsCount > 0,
        'يجب أن يوجد عناصر بلون #B70F32'
    );

    console.log(`   📊 عدد العناصر الزرقاء المكتشفة: ${blueElementsCount}`);
    console.log(`   📊 عدد العناصر الحمراء (البراند): ${redElementsCount}`);

    console.log('\n%c💾 اختبار 3: البيانات المحفوظة', 'color: #B70F32; font-size: 16px; font-weight: bold;');
    console.log('─────────────────────────────────────────\n');

    // Test 5: LocalStorage Keys
    const expectedKeys = [
        'nexus_products',
        'nexus_inventory',
        'nexus_movements',
        'nexus_warehouses'
    ];

    expectedKeys.forEach(key => {
        test(
            `مفتاح LocalStorage: ${key}`,
            localStorage.getItem(key) !== null,
            `يجب أن يكون ${key} موجوداً في LocalStorage`
        );
    });

    // Test 6: Check if data is valid JSON
    try {
        const products = JSON.parse(localStorage.getItem('nexus_products') || '[]');
        test(
            'بيانات الأصناف صالحة',
            Array.isArray(products),
            'يجب أن تكون بيانات الأصناف مصفوفة صالحة'
        );
        console.log(`   📊 عدد الأصناف المحفوظة: ${products.length}`);
    } catch (e) {
        test('بيانات الأصناف صالحة', false, 'بيانات JSON صالحة');
    }

    console.log('\n%c🔍 اختبار 4: عناصر الواجهة', 'color: #B70F32; font-size: 16px; font-weight: bold;');
    console.log('─────────────────────────────────────────\n');

    // Test 7: Sidebar exists
    test(
        'وجود الشريط الجانبي',
        document.querySelector('.bg-slate-900') !== null,
        'يجب أن يكون الشريط الجانبي موجوداً'
    );

    // Test 8: Header buttons exist
    const inboundButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('استلام')
    );
    test(
        'وجود زر استلام',
        inboundButton !== undefined,
        'يجب أن يوجد زر "استلام"'
    );

    const outboundButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('صرف')
    );
    test(
        'وجود زر صرف',
        outboundButton !== undefined,
        'يجب أن يوجد زر "صرف"'
    );

    // Test 9: Menu items
    const menuItems = document.querySelectorAll('nav li');
    test(
        'وجود قوائم التنقل',
        menuItems.length > 0,
        'يجب أن توجد قوائم في الشريط الجانبي'
    );
    console.log(`   📊 عدد عناصر القائمة: ${menuItems.length}`);

    console.log('\n%c📱 اختبار 5: الاستجابة والأداء', 'color: #B70F32; font-size: 16px; font-weight: bold;');
    console.log('─────────────────────────────────────────\n');

    // Test 10: Page load time (estimate)
    if (performance && performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        test(
            'سرعة تحميل الصفحة',
            loadTime < 5000,
            'يجب أن يكون وقت التحميل أقل من 5 ثواني'
        );
        console.log(`   ⏱️ وقت التحميل: ${(loadTime / 1000).toFixed(2)} ثانية`);
    }

    // Test 11: React root exists
    test(
        'وجود جذر React',
        document.getElementById('root') !== null,
        'يجب أن يوجد عنصر #root'
    );

    // Test 12: Font loaded
    const body = document.body;
    const fontFamily = window.getComputedStyle(body).fontFamily;
    test(
        'تحميل خط Cairo',
        fontFamily.includes('Cairo'),
        'يجب أن يكون خط Cairo محملاً'
    );

    console.log('\n%c🎯 اختبار 6: الوظائف الديناميكية', 'color: #B70F32; font-size: 16px; font-weight: bold;');
    console.log('─────────────────────────────────────────\n');

    // Test 13: Check if brand-colors.css is loaded
    const stylesheets = Array.from(document.styleSheets);
    const brandColorSheet = stylesheets.some(sheet => {
        try {
            return sheet.href && sheet.href.includes('brand-colors.css');
        } catch (e) {
            return false;
        }
    });

    test(
        'تحميل ملف brand-colors.css',
        brandColorSheet,
        'يجب أن يكون ملف brand-colors.css محملاً'
    );

    // Test 14: Check root element has content
    const rootElement = document.getElementById('root');
    test(
        'الصفحة تحتوي على محتوى',
        rootElement && rootElement.children.length > 0,
        'يجب أن يحتوي #root على عناصر'
    );

    console.log('\n');
    console.log('%c===========================================', 'color: #B70F32; font-size: 20px; font-weight: bold;');
    console.log('%c       ملخص نتائج الاختبار       ', 'color: #B70F32; font-size: 20px; font-weight: bold;');
    console.log('%c===========================================', 'color: #B70F32; font-size: 20px; font-weight: bold;');
    console.log('\n');

    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`%c📊 إجمالي الاختبارات: ${totalTests}`, 'font-size: 14px; font-weight: bold;');
    console.log(`%c✅ اختبارات ناجحة: ${passedTests}`, 'color: green; font-size: 14px; font-weight: bold;');
    console.log(`%c❌ اختبارات فاشلة: ${failedTests}`, 'color: red; font-size: 14px; font-weight: bold;');
    console.log(`%c📈 نسبة النجاح: ${passRate}%`, 'font-size: 16px; font-weight: bold; color: ' + (passRate >= 90 ? 'green' : passRate >= 70 ? 'orange' : 'red') + ';');

    console.log('\n');

    if (passRate >= 90) {
        console.log('%c🎉 ممتاز! النظام يعمل بشكل رائع', 'color: green; font-size: 18px; font-weight: bold; background: #e8f5e9; padding: 10px;');
    } else if (passRate >= 70) {
        console.log('%c⚠️ جيد، لكن يحتاج بعض التحسينات', 'color: orange; font-size: 18px; font-weight: bold; background: #fff3e0; padding: 10px;');
    } else {
        console.log('%c❌ يحتاج إلى إصلاحات', 'color: red; font-size: 18px; font-weight: bold; background: #ffebee; padding: 10px;');
    }

    console.log('\n');
    console.log('%cللحصول على تفاصيل أكثر، راجع ملف TESTING_GUIDE.md', 'color: #666; font-style: italic;');

    // Return results object
    return {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: passRate + '%',
        timestamp: new Date().toLocaleString('ar-SA')
    };
})();
