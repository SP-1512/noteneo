
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  where, 
  addDoc, 
  doc, 
  getDoc, 
  deleteDoc, 
  updateDoc, 
  setDoc,
  increment,
  writeBatch,
  DocumentData,
  arrayUnion,
  arrayRemove,
  limit
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Note, UserProfile, Education } from '../types';

// --- Configuration ---

const getEnvVar = (key: string): string => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key] as string;
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] as string;
    }
  } catch (e) {}
  return '';
};

const apiKey = getEnvVar('VITE_FIREBASE_API_KEY') || getEnvVar('FIREBASE_API_KEY');
const isLocalMode = !apiKey || apiKey === "AIzaSy_PLACEHOLDER_KEY" || apiKey.includes("your_api_key");

if (isLocalMode) {
  console.warn("%c NoteNeo Running in Local Dev Mode ", "background: #222; color: #bada55; font-size: 12px; padding: 4px;");
}

let app, auth, db, storage, googleProvider: GoogleAuthProvider;

if (!isLocalMode) {
  try {
    const firebaseConfig = {
      apiKey: apiKey,
      authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || "placeholder.firebaseapp.com",
      projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || "placeholder-project",
      storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || "placeholder.appspot.com",
      messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') || "000000000000",
      appId: getEnvVar('VITE_FIREBASE_APP_ID') || "1:000000000000:web:0000000000000000000000"
    };
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

// --- Local Storage Mock Implementation ---
const LOCAL_STORAGE_KEY = 'noteneo_local_db';
const LOCAL_USER_KEY = 'noteneo_local_user';
const LOCAL_PROFILES_KEY = 'noteneo_profiles';
const LOCAL_BOOKMARKS_KEY = 'noteneo_bookmarks';

const getLocalDB = () => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    const initial = { notes: [] };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
};

const saveLocalDB = (data: any) => localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
const getLocalProfiles = () => JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');
const saveLocalProfiles = (data: any) => localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(data));
const getLocalBookmarks = () => JSON.parse(localStorage.getItem(LOCAL_BOOKMARKS_KEY) || '{}');
const saveLocalBookmarks = (data: any) => localStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify(data));

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const mockUserTemplate: any = { uid: 'local-dev-user-123', displayName: 'Dev User', email: 'dev@local.com', photoURL: 'https://ui-avatars.com/api/?name=Dev+User', emailVerified: true };

const authObservers: Array<(user: any) => void> = [];
const notifyObservers = (user: any) => {
  authObservers.forEach((cb) => cb(user));
};

const calculateLevel = (points: number) => {
    if (points < 50) return { level: 1, badge: 'Novice' };
    if (points < 200) return { level: 2, badge: 'Contributor' };
    if (points < 500) return { level: 3, badge: 'Helper' };
    return { level: 4, badge: 'Expert' };
};

const generateSerialNumber = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'NN-';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const api = {
  auth: {
    signInWithGoogle: async () => {
        if (isLocalMode) {
            await delay(500);
            const user = { ...mockUserTemplate, displayName: 'Google User (Local)', email: 'google@local.com', uid: 'google-local-'+Date.now() };
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
            notifyObservers(user);
            return { user, accessToken: 'mock-token' };
        }
        const result = await signInWithPopup(auth, googleProvider);
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, { uid: result.user.uid, email: result.user.email, displayName: result.user.displayName, photoURL: result.user.photoURL, role: 'student', followersCount: 0, followingCount: 0, points: 0, level: 1 });
        }
        return { user: result.user, accessToken: GoogleAuthProvider.credentialFromResult(result)?.accessToken };
    },
    signOut: async () => {
        if (isLocalMode) {
            localStorage.removeItem(LOCAL_USER_KEY);
            notifyObservers(null);
        } else {
            await firebaseSignOut(auth);
        }
    },
    onAuthStateChanged: (cb: any) => {
        if (isLocalMode) {
            const stored = localStorage.getItem(LOCAL_USER_KEY);
            const user = stored ? JSON.parse(stored) : null;
            cb(user);
            authObservers.push(cb);
            return () => {
                const idx = authObservers.indexOf(cb);
                if (idx > -1) authObservers.splice(idx, 1);
            };
        }
        return onAuthStateChanged(auth, cb);
    },
    signIn: async (e:string, p:string) => { 
        if(isLocalMode) {
            await delay(500);
            const profiles = getLocalProfiles();
            const existingUid = Object.keys(profiles).find(uid => profiles[uid].email === e);
            let user;
            if (existingUid) {
                user = { ...profiles[existingUid], emailVerified: true };
            } else {
                user = { ...mockUserTemplate, email: e, displayName: e.split('@')[0], uid: 'local-dev-user-123' };
            }
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
            notifyObservers(user);
            return;
        }
        await signInWithEmailAndPassword(auth, e, p); 
    },
    signUp: async (e:string, p:string, n:string) => { 
        if(isLocalMode) {
            await delay(500);
            const uid = 'local-' + Date.now();
            const newUser = { 
                uid, 
                email: e, 
                displayName: n, 
                photoURL: `https://ui-avatars.com/api/?name=${n}`, 
                emailVerified: true, 
                role: 'student', 
                points: 0, 
                level: 1 
            };
            const profiles = getLocalProfiles();
            profiles[uid] = newUser;
            saveLocalProfiles(profiles);
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
            notifyObservers(newUser);
            return;
        }
        const r = await createUserWithEmailAndPassword(auth, e, p);
        await updateProfile(r.user, { displayName: n });
        await setDoc(doc(db, 'users', r.user.uid), { uid: r.user.uid, email: e, displayName: n, role: 'student', points: 0, level: 1 });
    },
    resetPassword: async (e:string) => { 
        if(isLocalMode) { console.log("Local Mode: Password reset sent to " + e); return; }
        await sendPasswordResetEmail(auth, e); 
    }
  },
  users: {
    getProfile: async (uid: string): Promise<UserProfile | null> => {
      if (isLocalMode) {
        const p = getLocalProfiles()[uid];
        if (!p) {
             const session = JSON.parse(localStorage.getItem(LOCAL_USER_KEY) || 'null');
             if (session && session.uid === uid) return { ...session, level: 1, badges: ['Novice'] };
             return { ...mockUserTemplate, uid };
        }
        const points = p.points || 0;
        const { level, badge } = calculateLevel(points);
        return { ...p, level, badges: [badge] };
      }
      const docSnap = await getDoc(doc(db, 'users', uid));
      if (!docSnap.exists()) return null;
      const data = docSnap.data() as UserProfile;
      const { level, badge } = calculateLevel(data.points || 0);
      return { ...data, level, badges: [badge] };
    },
    updateProfile: async (uid: string, data: Partial<UserProfile>) => {
       if (isLocalMode) {
           const ps = getLocalProfiles();
           if (!ps[uid]) ps[uid] = { ...mockUserTemplate, uid };
           ps[uid] = { ...ps[uid], ...data };
           saveLocalProfiles(ps);
           const session = JSON.parse(localStorage.getItem(LOCAL_USER_KEY) || 'null');
           if (session && session.uid === uid) {
               localStorage.setItem(LOCAL_USER_KEY, JSON.stringify({ ...session, ...data }));
               notifyObservers({ ...session, ...data });
           }
           return;
       }
       await updateDoc(doc(db, 'users', uid), data as DocumentData);
    },
    follow: async (currentUid: string, targetUid: string) => {
        if (!isLocalMode) {
            const batch = writeBatch(db);
            batch.set(doc(db, 'users', currentUid, 'following', targetUid), { timestamp: new Date() });
            batch.set(doc(db, 'users', targetUid, 'followers', currentUid), { timestamp: new Date() });
            batch.update(doc(db, 'users', currentUid), { followingCount: increment(1) });
            batch.update(doc(db, 'users', targetUid), { followersCount: increment(1), points: increment(5) });
            await batch.commit();
        }
    },
    unfollow: async (currentUid: string, targetUid: string) => {
        if (!isLocalMode) {
             const batch = writeBatch(db);
             batch.delete(doc(db, 'users', currentUid, 'following', targetUid));
             batch.delete(doc(db, 'users', targetUid, 'followers', currentUid));
             batch.update(doc(db, 'users', currentUid), { followingCount: increment(-1) });
             batch.update(doc(db, 'users', targetUid), { followersCount: increment(-1) });
             await batch.commit();
        }
    },
    getFollowingIds: async (uid: string) => {
        if(isLocalMode) return [];
        const s = await getDocs(collection(db, 'users', uid, 'following'));
        return s.docs.map(d => d.id);
    },
    isFollowing: async (c: string, t: string) => {
        if(isLocalMode) return false;
        const s = await getDoc(doc(db, 'users', c, 'following', t));
        return s.exists();
    },
    toggleBookmark: async (uid: string, noteId: string, isBookmarked: boolean) => {
        if (isLocalMode) {
            const b = getLocalBookmarks();
            if (!b[uid]) b[uid] = [];
            if (isBookmarked) b[uid] = b[uid].filter((id: string) => id !== noteId);
            else if (!b[uid].includes(noteId)) b[uid].push(noteId);
            saveLocalBookmarks(b);
            return;
        }
        const bookmarkRef = doc(db, 'users', uid, 'bookmarks', noteId);
        if (isBookmarked) await deleteDoc(bookmarkRef);
        else await setDoc(bookmarkRef, { timestamp: new Date() });
    },
    getBookmarks: async (uid: string): Promise<string[]> => {
        if (isLocalMode) return getLocalBookmarks()[uid] || [];
        const snap = await getDocs(collection(db, 'users', uid, 'bookmarks'));
        return snap.docs.map(d => d.id);
    }
  },
  notes: {
    getAll: async () => {
      if (isLocalMode) return getLocalDB().notes.filter((n: Note) => n.copyrightStatus !== 'infringing');
      const q = query(collection(db, 'notes'), where('copyrightStatus', '!=', 'infringing'), orderBy('uploadDate', 'desc'));
      const s = await getDocs(q);
      return s.docs.map(d => ({ id: d.id, ...d.data() } as Note));
    },
    getUserNotes: async (userId: string) => {
      if (isLocalMode) return getLocalDB().notes.filter((n: Note) => (n.uploaderIds?.includes(userId) || n.uploaderId === userId) && n.copyrightStatus !== 'infringing');
      const q = query(collection(db, 'notes'), where('uploaderIds', 'array-contains', userId));
      const s = await getDocs(q);
      return s.docs.map(d => ({ id: d.id, ...d.data() } as Note)).filter(n => n.copyrightStatus !== 'infringing');
    },
    getById: async (id: string) => {
       if (isLocalMode) return getLocalDB().notes.find((n: Note) => n.id === id);
       const d = await getDoc(doc(db, 'notes', id));
       return d.exists() ? { id: d.id, ...d.data() } as Note : null;
    },
    checkDuplicateHash: async (hash: string): Promise<Note | null> => {
      if (isLocalMode) return getLocalDB().notes.find((n: Note) => n.ai?.contentHash === hash && n.copyrightStatus !== 'infringing') || null;
      const q = query(collection(db, 'notes'), where('ai.contentHash', '==', hash), where('copyrightStatus', '!=', 'infringing'), limit(1));
      const s = await getDocs(q);
      return s.empty ? null : { id: s.docs[0].id, ...s.docs[0].data() } as Note;
    },
    create: async (noteData: Omit<Note, 'id'>) => {
      const qualityBonus = (noteData.ai?.quality?.score || 0) > 8 ? 20 : 0;
      const pointsEarned = 10 + qualityBonus;
      const serialNumber = generateSerialNumber();
      const finalNoteData = { ...noteData, serialNumber, copyrightStatus: 'original' as const };
      if (isLocalMode) {
          const dbData = getLocalDB();
          dbData.notes.unshift({ ...finalNoteData, id: Date.now().toString() });
          saveLocalDB(dbData);
          const profiles = getLocalProfiles();
          if(profiles[finalNoteData.uploaderId]) {
              profiles[finalNoteData.uploaderId].points = (profiles[finalNoteData.uploaderId].points || 0) + pointsEarned;
              saveLocalProfiles(profiles);
          }
          return 'local-id';
      }
      const batch = writeBatch(db);
      const noteRef = doc(collection(db, 'notes'));
      batch.set(noteRef, finalNoteData);
      const userRef = doc(db, 'users', finalNoteData.uploaderId);
      batch.update(userRef, { points: increment(pointsEarned) });
      finalNoteData.coAuthors?.forEach(ca => {
          if(ca.uid) {
               const caRef = doc(db, 'users', ca.uid);
               batch.update(caRef, { points: increment(5) }).catch(() => {});
          }
      });
      await batch.commit();
      return noteRef.id;
    },
    claimCopyright: async (infringingNoteId: string, claimantId: string) => {
      const note = await api.notes.getById(infringingNoteId);
      if (!note || note.uploaderId === claimantId) return;

      if (isLocalMode) {
          const dbData = getLocalDB();
          const idx = dbData.notes.findIndex((n: Note) => n.id === infringingNoteId);
          if (idx > -1) {
              dbData.notes[idx].copyrightStatus = 'infringing';
              saveLocalDB(dbData);
              const profiles = getLocalProfiles();
              if (profiles[note.uploaderId]) {
                  profiles[note.uploaderId].points = (profiles[note.uploaderId].points || 0) - 50;
                  saveLocalProfiles(profiles);
              }
          }
          return;
      }
      
      const batch = writeBatch(db);
      batch.update(doc(db, 'notes', infringingNoteId), { copyrightStatus: 'infringing' });
      batch.update(doc(db, 'users', note.uploaderId), { points: increment(-50) });
      await batch.commit();
    },
    delete: async (id: string) => {
       if(isLocalMode) {
           const db = getLocalDB();
           db.notes = db.notes.filter((n: Note) => n.id !== id);
           saveLocalDB(db);
           return;
       }
       await deleteDoc(doc(db, 'notes', id));
    },
    update: async (id: string, data: any) => {
       if(isLocalMode) {
           const db = getLocalDB();
           const idx = db.notes.findIndex((n: Note) => n.id === id);
           if(idx > -1) {
               db.notes[idx] = { ...db.notes[idx], ...data };
               saveLocalDB(db);
           }
           return;
       }
       await updateDoc(doc(db, 'notes', id), data);
    }
  },
  storage: {
    uploadFile: async (file: File, path: string) => {
        if(isLocalMode) return URL.createObjectURL(file);
        const r = ref(storage, path);
        await uploadBytes(r, file);
        return getDownloadURL(r);
    },
    uploadToDrive: async (file: File, token: string) => { return 'https://drive.google.com/mock-preview'; }
  },
  isLocalMode
};