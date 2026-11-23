package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.integration.schoolinfo.SchoolInfoClient;
import java.lang.reflect.Method;
import java.util.List;

/** 시험 전용: SchoolInfoClient 의 package 전용 파서 메서드를 다른 패키지 시험에서 부른다(제품 코드 공개 범위를 넓히지 않음). */
final class SchoolInfoClientAccess {

    private SchoolInfoClientAccess() {
    }

    private static Object call(String name, Class<?>[] types, Object... args) {
        try {
            Method m = SchoolInfoClient.class.getDeclaredMethod(name, types);
            m.setAccessible(true);
            return m.invoke(null, args);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }

    static String address(String html) {
        return (String) call("address", new Class<?>[] {String.class}, html);
    }

    static String[] region(String address) {
        return (String[]) call("region", new Class<?>[] {String.class}, address);
    }

    @SuppressWarnings("unchecked")
    static List<SchoolInfoClient.Disclosure> disclosures(String item, SchoolInfoClient.Disclosure[] sel) {
        return (List<SchoolInfoClient.Disclosure>) call("disclosures", new Class<?>[] {String.class, SchoolInfoClient.Disclosure[].class}, item, sel);
    }

    static String fileName(String disp, String fallback) {
        return (String) call("fileName", new Class<?>[] {String.class, String.class}, disp, fallback);
    }

    static void unzip(byte[] zip, String seq, List<SchoolInfoClient.PlanFile> out, List<SchoolInfoClient.Problem> problems, String name) {
        call("unzip", new Class<?>[] {byte[].class, String.class, List.class, List.class, String.class}, zip, seq, out, problems, name);
    }
}
