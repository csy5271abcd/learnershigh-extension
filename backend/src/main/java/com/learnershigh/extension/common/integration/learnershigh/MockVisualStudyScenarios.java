package com.learnershigh.extension.common.integration.learnershigh;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Local visual-review data, not a representative sample of a real learning center.
 * Recent rows describe independent observations, not desired care classifications.
 * Earlier weeks use weekday routines, week-level variation and reproducible day noise.
 * The original domain/API regression fixture is kept separately in MockStudyScenarios.
 */
final class MockVisualStudyScenarios {
    private static final String[] SUBJECTS = {"국어", "수학", "영어", "탐구"};
    // Each observation row is Sun..Sat; actual weekdays select records even when the anchor moves.
    private static final int[][] STUDY = {
        {166,230,265,0,0,0,0}, {310,95,0,220,330,160,285},
        {75,112,45,25,180,61,38}, {45,180,70,145,100,220,105},
        {240,125,325,210,0,360,180}, {80,110,95,130,75,60,135},
        {130,62,150,0,190,85,120}, {90,0,0,65,0,0,180},
        {420,610,540,510,630,480,575}, {390,235,170,305,185,260,420},
        {350,120,180,145,210,160,420}, {100,145,90,30,45,0,65}, {420,90,0,125,180,140,460}
    };
    private static final int[][] PLAN = {
        {184,263,263,180,0,240,0}, {390,0,240,270,0,180,0},
        {180,210,0,170,220,160,150}, {150,160,180,190,180,170,160},
        {280,160,300,240,120,330,210}, {160,180,140,180,130,120,150},
        {240,120,160,180,220,0,140}, {120,80,0,110,0,70,200},
        {480,600,570,570,660,540,600}, {360,240,210,290,190,250,390},
        {390,150,180,190,240,150,450}, {180,240,210,0,180,180,120}, {360,120,150,150,200,0,400}
    };
    private static final int[][] START = {
        {1101,1090,1100,-1,-1,-1,-1}, {655,1100,-1,1085,1030,1170,600},
        {700,1185,1220,1200,1050,1210,825}, {720,1110,1150,1105,1110,1050,740},
        {600,1120,1050,1130,1170,1000,650}, {1190,1240,1305,1230,1320,1350,1215},
        {750,1180,1060,-1,1020,1160,700}, {680,1090,1115,-2,-1,-1,750},
        {620,588,603,602,595,600,615}, {660,1090,1150,1050,1140,1100,615},
        {630,1140,1105,1120,1085,1145,570}, {700,1160,1190,1280,1235,-1,810}, {550,1175,-1,1190,1100,1150,540}
    };
    private static final int[] USUAL_MINUTES = {245,260,210,160,260,175,190,180,550,270,205,240,230};
    private static final int[] WEEKDAY_START = {1090,1100,1140,1095,1110,1150,1120,1100,600,1090,1120,1130,1170};
    private static final int[] WEEKEND_START = {720,660,780,720,660,900,750,750,615,630,600,750,540};
    private static final int[][] SHARE = {
        {20,40,25,15}, {15,50,20,15}, {35,20,30,15}, {10,25,40,25},
        {30,10,30,30}, {15,45,25,15}, {30,25,20,25}, {40,15,30,15},
        {10,55,15,20}, {25,25,25,25}, {40,20,10,30}, {10,40,35,15}, {20,30,30,20}
    };

    private MockVisualStudyScenarios() { }

    static ExistingDailyStudy dayOf(String id, LocalDate date, LocalDate anchor) {
        int student = index(id);
        if (student < 0) return MockStudyScenarios.dayOf(id, date, anchor);
        int offset = Math.toIntExact(ChronoUnit.DAYS.between(anchor, date));
        boolean weekend = date.getDayOfWeek().getValue() >= 6;
        int week = Math.floorDiv(offset + 6, 7);
        int routine = weekend ? WEEKEND_START[student] : WEEKDAY_START[student];
        int start = routine + random(id, date, "arrival", 91) - 45;
        double weekly = .80 + random(id, anchor.plusWeeks(week), "week", 41) / 100.0;
        double daily = .62 + random(id, date, "study", 78) / 100.0;
        int study = (int) Math.round(USUAL_MINUTES[student] * weekly * daily * (weekend ? 1.25 : 1));
        int planned = (int) Math.round(USUAL_MINUTES[student] * (weekend ? 1.2 : 1)
                * (.75 + random(id, date, "plan", 61) / 100.0));
        boolean checkedIn = random(id, date, "attendance", 100) >= (student == 8 ? 6 : 12);
        boolean submitted = random(id, date, "submission", 100) >= 16;
        boolean available = !(student == 7 && offset == -19);
        Boolean scheduled = true;
        int[] planWeights = variedShares(SHARE[student], id, date, "plan-share");
        int[] actualWeights = variedShares(SHARE[student], id, date, "actual-share");
        if (offset >= -6 && offset <= 0) {
            int day = date.getDayOfWeek().getValue() % 7;
            study = STUDY[student][day];
            planned = PLAN[student][day];
            start = START[student][day];
            checkedIn = start != -1;
            submitted = planned > 0;
            // One genuinely unavailable day; neither a manufactured zero nor a confirmed absence.
            available = !(student == 7 && day == 4);
            if (student == 7 && day == 5) scheduled = null;
            if (student == 4) {
                planWeights = SHARE[student];
                int math = new int[]{75,100,55,95,0,100,90}[day];
                actualWeights = new int[]{(100-math)/3, math, (100-math)/3,
                        100-math-2*((100-math)/3)};
            }
        }
        if (!available) return new ExistingDailyStudy(date, false, null, Map.of(), false, Map.of(), null, false);
        // Study time cannot exceed the time left that day after the observed first entry.
        if (!checkedIn) study = 0;
        else if (start >= 0) study = Math.min(study, 1440-start);
        return new ExistingDailyStudy(date, checkedIn, checkedIn && start >= 0 ? LocalTime.of(start/60,start%60) : null,
                split(study, actualWeights), submitted, submitted ? split(planned, planWeights) : Map.of(), scheduled, true);
    }

    private static int index(String id) {
        for (int i=0; i<10; i++) if (id.equals("stu_%03d".formatted(i+1))) return i;
        for (int i=0; i<3; i++) if (id.equals("stu_%03d".formatted(i+101))) return i+10;
        return -1;
    }

    private static int[] variedShares(int[] usual, String id, LocalDate date, String salt) {
        int focus = random(id,date,salt+"focus",4);
        int[] weights = new int[4];
        for (int i=0;i<4;i++) weights[i] = Math.max(0,usual[i]+random(id,date,salt+i,31)-15)
                + (i==focus ? random(id,date,salt+"extra",55) : 0);
        return weights;
    }

    private static Map<String,Integer> split(int total,int[] weights) {
        if (total<=0) return Map.of();
        int sum=java.util.Arrays.stream(weights).sum(), assigned=0;
        Map<String,Integer> result=new LinkedHashMap<>();
        for(int i=0;i<4;i++) {
            int minutes=i==3 ? total-assigned : (int)((long)total*weights[i]/sum);
            assigned+=minutes;
            result.put(SUBJECTS[i],minutes);
        }
        return result;
    }

    private static int random(String id,LocalDate date,String salt,int bound) {
        // Avalanche consecutive-date hashes so date increments do not produce linear mini-patterns.
        int seed=Objects.hash(id,date.toEpochDay(),salt);
        seed=(seed^(seed>>>16))*0x45d9f3b;
        seed=(seed^(seed>>>16))*0x45d9f3b;
        return Math.floorMod(seed^(seed>>>16),bound);
    }
}
