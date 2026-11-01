#include<bits/stdc++.h>
using namespace std;
void print (map<int, string> &m){
    cout<<m.size() <<endl;
    for(auto &pr : m){
        cout<< pr.first <<" " << pr.second <<endl;
        //access timecomplexity: O(log(n))
    }
}
int main(){
    map<int, string> m;
    m[1] = "abc"; //value inserting time compexity : O(log(n))
    m[5] = "cdc";
    m[3]= "acd";
    m.insert({4,"afg"});
    auto it = m.find(7);//time compexity of find o(log(n))// find(3) will find value of 3 in map m and it will return iterator if there will be 
    //no value of 3 i.e if 3 will not be found it will return m.end()
    //all keys are unique in maps
    // print(m);
    // m.erase(); this erase the input value
    // m.erase(it); //time complexity of m.erase is log(n). //    auto it = m.find(5); it point kr rha 5 ko so m.erase se 5 wala delete ho jayega
   //auto it = m.find(7); 7 naam ka koi value nhi hai so ye m.end ko point krega. m.erase m.end ke baad ke iterator ko point krega so usko  remove krega to segmentation error aayega 
  // so ye check operator lga denge if loop lagake

   if(it != m.end())
   m.erase(it);
   m.clear(); //map ke sabko clear ker dega;.
    // if(it == m.end()){
    //     cout<< "No value";
    // 
    // }
    // else{
    //     cout << (*it).first << " " << (*it).second;
    // }
    print (m); //we can see m.erase() will not print that map
}